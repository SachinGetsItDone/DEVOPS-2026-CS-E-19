pipeline {
    agent any

    environment {
        // Use the virtual environment path inside the workspace
        VENV_DIR = "venv"
        PYTHON = "${WORKSPACE}\\${VENV_DIR}\\Scripts\\python.exe"
        PIP = "${WORKSPACE}\\${VENV_DIR}\\Scripts\\pip.exe"
        PYTEST = "${WORKSPACE}\\${VENV_DIR}\\Scripts\\pytest.exe"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend: Setup Environment') {
            steps {
                bat """
                if not exist "${VENV_DIR}" (
                    python -m venv ${VENV_DIR}
                )
                """
            }
        }

        stage('Backend: Install Dependencies') {
            steps {
                // requirements.txt and tests/ live under server/, not repo root.
                dir('server') {
                    bat """
                    ${PIP} install --upgrade pip
                    ${PIP} install -r requirements.txt
                    ${PIP} install pytest httpx
                    """
                }
            }
        }

        stage('Backend: Run Tests') {
            steps {
                dir('server') {
                    bat """
                    set PYTHONPATH=${WORKSPACE}\\server
                    ${PYTEST} tests/ --junitxml=test-results.xml
                    """
                }
            }
        }

        stage('Frontend: Install Dependencies') {
            steps {
                dir('client') {
                    bat "npm ci"
                }
            }
        }

        stage('Frontend: Build Check') {
            // No test framework (vitest/jest) is wired up in client/ yet, and
            // there's no `test` script in package.json — this stage is a
            // build/smoke check, not real test coverage. It still catches
            // real regressions: a broken import or syntax error fails the
            // build the same way it would fail `npm run dev` for a teammate.
            // Swap this for `npm test` once component tests exist.
            steps {
                dir('client') {
                    bat "npm run build"
                }
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: 'server/test-results.xml'
            archiveArtifacts artifacts: 'server/test-results.xml', allowEmptyArchive: true
        }
        success {
            echo "Pipeline completed successfully!"
        }
        failure {
            echo "Pipeline failed! Please check the logs."
        }
    }
}
