pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend: Install Dependencies') {
            // The backend was migrated from Python/FastAPI to Node/Express
            // on 2026-09-21 (see server/package.json) - server/requirements.txt
            // and server/tests/ (pytest) no longer exist, so this pipeline
            // no longer needs a Python venv at all.
            steps {
                dir('server') {
                    bat 'npm ci'
                }
            }
        }

        stage('Backend: Run Tests') {
            // There are no *.test.js files in server/ yet (only a jest setup
            // file, tests/env.js) - --passWithNoTests keeps that honest
            // instead of the build silently failing on "no tests found."
            // Swap that flag out once real tests exist.
            steps {
                dir('server') {
                    bat 'npx jest --runInBand --passWithNoTests --reporters=default --reporters=jest-junit'
                }
            }
        }

        stage('Frontend: Install Dependencies') {
            steps {
                dir('client') {
                    bat 'npm ci'
                }
            }
        }

        stage('Frontend: Build Check') {
            // No test framework (vitest/jest) is wired up in client/ yet, and
            // there's no `test` script in package.json - this stage is a
            // build/smoke check, not real test coverage. It still catches
            // real regressions: a broken import or syntax error fails the
            // build the same way it would fail `npm run dev` for a teammate.
            // Swap this for `npm test` once component tests exist.
            steps {
                dir('client') {
                    bat 'npm run build'
                }
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: 'server/junit.xml'
            archiveArtifacts artifacts: 'server/junit.xml', allowEmptyArchive: true
        }
        success {
            echo "Pipeline completed successfully!"
        }
        failure {
            echo "Pipeline failed! Please check the logs."
        }
    }
}
