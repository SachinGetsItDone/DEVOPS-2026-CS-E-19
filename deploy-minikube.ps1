$ErrorActionPreference = "Stop"

Write-Host "Checking prerequisites..."
foreach ($cmd in @("docker", "kubectl", "minikube")) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    throw "Missing prerequisite: $cmd. Install Docker Desktop, kubectl, and Minikube first."
  }
}

minikube status
if ($LASTEXITCODE -ne 0) {
  minikube start
  if ($LASTEXITCODE -ne 0) { throw "Minikube failed to start." }
}

Write-Host "Building images inside Minikube's Docker environment..."
$dockerEnv = minikube docker-env --shell powershell
if ($LASTEXITCODE -ne 0) { throw "Could not configure Minikube Docker environment." }
Invoke-Expression $dockerEnv

docker build -t prepline-backend:local ./server
if ($LASTEXITCODE -ne 0) { throw "Backend image build failed." }

docker build -t prepline-frontend:local --build-arg VITE_API_URL= ./client
if ($LASTEXITCODE -ne 0) { throw "Frontend image build failed." }

$jwt = Read-Host "Enter a long random JWT_SECRET (do not reuse a password)"
if ([string]::IsNullOrWhiteSpace($jwt) -or $jwt.Length -lt 32) {
  throw "JWT_SECRET must be at least 32 characters."
}

kubectl create namespace prepline --dry-run=client -o yaml | kubectl apply -f -
if ($LASTEXITCODE -ne 0) { throw "Could not ensure namespace." }

kubectl -n prepline create secret generic prepline-secrets `
  --from-literal=JWT_SECRET="$jwt" `
  --dry-run=client -o yaml | kubectl apply -f -
if ($LASTEXITCODE -ne 0) { throw "Could not create/update Kubernetes secret." }

$llm = Read-Host "LLM provider API key (press Enter to skip; AI features may use fallbacks)"
if (-not [string]::IsNullOrWhiteSpace($llm)) {
  kubectl -n prepline create secret generic prepline-secrets `
    --from-literal=JWT_SECRET="$jwt" `
    --from-literal=GROQ_API_KEY="$llm" `
    --dry-run=client -o yaml | kubectl apply -f -
  if ($LASTEXITCODE -ne 0) { throw "Could not update Kubernetes secret with LLM key." }
}

kubectl apply -f .\k8s\prepline.yaml
if ($LASTEXITCODE -ne 0) { throw "Applying Kubernetes manifests failed." }

kubectl -n prepline rollout status deployment/mongodb --timeout=180s
kubectl -n prepline rollout status deployment/backend --timeout=180s
kubectl -n prepline rollout status deployment/frontend --timeout=180s

Write-Host "`nDeployment objects are ready."
Write-Host "Open another terminal and run: minikube service frontend -n prepline"
Write-Host "Useful checks: kubectl get all,pvc -n prepline"
