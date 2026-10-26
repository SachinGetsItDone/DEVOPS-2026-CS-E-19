pipeline {
    agent any

    stages {
        stage('Install Dependencies') {
            steps {
                dir('client') {
                    // Installs exact dependencies from client/package-lock.json
                    bat 'npm ci'
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir('client') {
                    // Runs the Vite production build to compile static assets into client/dist/
                    bat 'npm run build'
                }
            }
        }
    }

    post {
        success {
            echo 'Frontend build completed successfully!'
        }
        failure {
            echo 'Pipeline failed! Please check the console output above.'
        }
    }
}
