# Prepline Kubernetes Deployment (Minikube)

This is a local Kubernetes deployment for the existing Prepline project. It uses the existing `server/Dockerfile` and `client/Dockerfile`, deploys MongoDB with a persistent volume claim, and routes frontend `/api/*` and `/ws/*` traffic to the backend through Nginx.

## Requirements

- Docker Desktop running
- Minikube
- `kubectl`
- Run these commands from the repository root (`DEVOPS-2026-CS-E-19`)

## Fast path (Windows PowerShell)

1. Extract/copy the `k8s` folder and `deploy-minikube.ps1` into the repository root.
2. Start PowerShell in the repository root.
3. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\deploy-minikube.ps1
```

The script builds both images in Minikube's Docker environment, asks for a JWT secret and optionally an LLM provider API key, applies the Kubernetes YAML, and waits for rollouts.

## Open the app

```powershell
minikube service frontend -n prepline
```

Or, to use a stable local URL in a separate terminal:

```powershell
kubectl port-forward -n prepline service/frontend 8080:80
```

Then open `http://localhost:8080`.

## Useful commands

```powershell
kubectl get pods,svc,pvc -n prepline
kubectl get deployments -n prepline
kubectl logs -n prepline deployment/backend
kubectl logs -n prepline deployment/frontend
kubectl describe pods -n prepline
kubectl delete namespace prepline
```

## Important notes

- The manifests use `imagePullPolicy: Never`, intentionally for local Minikube images. For a remote cluster, push both images to a registry and change the image names and pull policy.
- MongoDB data is stored in a 1 GiB PVC. The storage class must support dynamic provisioning (Minikube normally provides this).
- `JWT_SECRET` is required in production. Do not commit real keys or secrets.
- If using DeepSeek rather than Groq, set the matching API key and base URL in the `prepline-secrets` Secret.
- This setup uses a local MongoDB instance for the Kubernetes demo; it does not automatically import data from the hosted Render service.
- Kubernetes deployment is not the same as moving the existing Vercel/Render deployment to Kubernetes. This provides a separate, local cluster demonstration.
