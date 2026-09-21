'use strict';

const { WebSocketServer } = require('ws');
const { verifyToken } = require('./middleware/auth');
const { processTurn, skipTurn, generateReport, findOwnedInterview } = require('./interviewEngine');
const config = require('./config');

const MAX_WS_MESSAGE = 512 * 1024; // 512KB - keeps base64 audio turns bounded

function setupWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_WS_MESSAGE });

  // Auth happens at upgrade time; identity is bound to the socket, never
  // taken from messages.
  server.on('upgrade', (req, socket, head) => {
    let pathname = '/';
    let token = null;
    try {
      const url = new URL(req.url, 'http://localhost');
      pathname = url.pathname;
      token = url.searchParams.get('token');
    } catch {
      socket.destroy();
      return;
    }
    if (pathname !== '/ws/interview') {
      socket.destroy();
      return;
    }
    let user;
    try {
      if (!token) throw new Error('missing token');
      const payload = verifyToken(token);
      user = { id: payload.sub, email: payload.email };
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (raw) => {
      // Every message is handled in its own try/catch: one bad frame or a
      // service hiccup sends an error frame instead of killing the socket.
      let parsed;
      try {
        parsed = JSON.parse(String(raw));
        if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Messages must be JSON objects.' }));
        return;
      }
      const { type } = parsed;
      try {
        if (type === 'init') {
          const interview = await findOwnedInterview(parsed.interview_id, ws.user.id);
          if (!interview) {
            ws.send(JSON.stringify({ type: 'error', message: 'Interview not found.' }));
            return;
          }
          ws.send(
            JSON.stringify({
              type: 'init',
              interview_id: String(interview._id),
              role: interview.role,
              first_question: interview.started_question,
              status: interview.status,
            })
          );
          return;
        }

        if (type === 'turn') {
          const transcript = String(parsed.transcript || '').trim().slice(0, config.MAX_TEXT_CHARS);
          if (!transcript) {
            ws.send(
              JSON.stringify({ type: 'error', message: 'Provide a transcript (use the REST route for audio files).' })
            );
            return;
          }
          const result = await processTurn({
            userId: ws.user.id,
            interviewId: parsed.interview_id,
            transcript,
          });
          if (result.notFound) {
            ws.send(JSON.stringify({ type: 'error', message: 'Interview not found.' }));
            return;
          }
          if (result.ended) {
            ws.send(JSON.stringify({ type: 'error', message: 'This interview has ended.' }));
            return;
          }
          ws.send(JSON.stringify({ type: 'turn_result', ...result }));
          return;
        }

        if (type === 'skip') {
          const result = await skipTurn({ userId: ws.user.id, interviewId: parsed.interview_id });
          if (result.notFound) {
            ws.send(JSON.stringify({ type: 'error', message: 'Interview not found.' }));
            return;
          }
          ws.send(JSON.stringify({ type: 'skip_result', ...result }));
          return;
        }

        if (type === 'end') {
          const result = await generateReport({ userId: ws.user.id, interviewId: parsed.interview_id });
          if (result.notFound) {
            ws.send(JSON.stringify({ type: 'error', message: 'Interview not found.' }));
            return;
          }
          if (result.noTurns) {
            ws.send(JSON.stringify({ type: 'error', message: 'No answered turns to report on yet.' }));
            return;
          }
          ws.send(
            JSON.stringify({
              type: 'report_ready',
              report_id: String(result.report._id),
              interview_id: String(result.report.interview),
              overall_score: result.report.overall_score,
              cached: result.cached,
            })
          );
          return;
        }

        ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${String(type)}` }));
      } catch (err) {
        console.warn(`[ws] message handling failed: ${err.message}`);
        try {
          ws.send(JSON.stringify({ type: 'error', message: 'Internal error handling your message.' }));
        } catch {
          /* socket already gone */
        }
      }
    });
  });

  // Heartbeat: dead clients are terminated instead of leaking.
  const interval = setInterval(() => {
    for (const client of wss.clients) {
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 30_000);
  wss.on('close', () => clearInterval(interval));

  return wss;
}

module.exports = { setupWebSocket };
