pipeline {
    agent any

    stages {
        stage('Install Dependencies') {
            steps {
                dir('client') {
                    // Installs exact dependencies from client/package-lock.json
                    script {
                        if (isUnix()) {
                            sh 'npm ci'
                        } else {
                            bat 'npm ci'
                        }
                    }
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir('client') {
                    // Compiles frontend production assets into client/dist/
                    script {
                        if (isUnix()) {
                            sh 'npm run build'
                        } else {
                            bat 'npm run build'
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Frontend build completed successfully!'
            archiveArtifacts artifacts: 'client/dist/**', allowEmptyArchive: true
        }
        failure {
            echo 'Pipeline failed! Please check the console output above.'
        }
    }
}
