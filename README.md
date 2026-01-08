# 🛒 E-Commerce Microservices Architecture on AWS EKS

This project demonstrates a production-grade, highly available microservices application deployed on **AWS Elastic Kubernetes Service (EKS)**. It features a complete CI/CD pipeline, automated infrastructure provisioning, and a robust monitoring stack (Prometheus & Grafana) along with AWS CloudWatch integration.

---

## 🏛️ Project Architecture

![Project Architecture](architecture_diagram.png)

### 📊 System Workflow

The architecture follows a standard 3-tier model adapted for Kubernetes:

1.  **Ingress Layer**: AWS Classic Load Balancers routing traffic to the EKS nodes.
2.  **Logic Layer**: Microservices running in the `ecommerce` namespace with 2 replicas each for High Availability.
3.  **Data Layer**: AWS RDS MySQL instance located in isolated private subnets.

---

## 🏗️ Technical Component Breakdown

### 1. AWS Infrastructure (Terraform)

The environment is provisioned using highly modular Terraform code:

- **Networking**: Custom VPC (`10.0.0.0/16`) with:
  - **2x Public Subnets**: Hosting NAT Gateways and Load Balancers.
  - **2x Private Subnets**: Hosting EKS Worker Nodes.
  - **2x Isolated Private Subnets**: Dedicated for the RDS MySQL instance.
- **Compute**: EKS Cluster (Managed Node Group) using `t3.medium` instances to support the heavy Jenkins and Monitoring workloads.
- **Database**: RDS MySQL 8.0 with storage autoscaling (20GB → 100GB).

### 2. DevOps & CI/CD (Jenkins)

Jenkins is deployed as a stateful set within the `tools` namespace:

- **Automation**: Uses `init.groovy.d` scripts to automatically:
  - Disable CSRF protection (required for CI/CD triggers).
  - Configure the Kubernetes Cloud plugin for dynamic agent scaling.
- **Build Isolation**: Implements a **Kaniko Multi-Pod** strategy. Each build runs in a dedicated ephemeral pod to avoid the known "Kaniko workspace corruption" issue during parallel Node.js builds.
- **Security**: Granular RBAC permissions allow Jenkins to safely manage deployments without requiring `cluster-admin` privileges.

> [!WARNING]
>
> ### ⚠️ Critical Project Notes
>
> 1. **Jenkins Persistence**: In this current deployment (`jenkins-deployment.yaml`), the Jenkins home is mounted as an `emptyDir`. This means **all data (pipelines, users) will be lost** if the pod is restarted. In a production environment, you must switch this to an AWS EFS or EBS volume.
> 2. **AWS Academy Environment**: If deploying through an AWS Academy learner lab, you **must** use the `LabRole` for all IAM roles in Terraform. The code in `terraform/eks.tf` has been optimized to handle these permission constraints.
> 3. **NAT Gateway Costs**: This project provisions 2 NAT Gateways. They are essential for the private subnets but are the primary driver of the $40+ cost. Ensure you run the cleanup step immediately after finishing your lab.

### 3. Monitoring & Observability

- **Prometheus**: Configured with Kubernetes Service Discovery to automatically find and scrape any pods with `prometheus.io/scrape: "true"` annotations.
- **Grafana**: Pre-configured with an "E-Commerce" dashboard including:
  - **Traffic Load**: Calculated via `sum(rate(node_cpu_seconds_total))` as a proxy for app demand.
  - **Memory/CPU**: Individual pod tracking for bottleneck identification.
  - **Default Credentials**: `admin` / `admin123`.
- **CloudWatch**: Visualizes RDS IOPS, Latency, and Free Storage Space to ensure database health.

---

## 🚀 Implementation Guide (The "ETP" Steps)

### Phase 1: Infrastructure Setup

```bash
cd terraform
terraform init
terraform apply -auto-approve
```

_Wait for outputs. Note the `rds_endpoint` for the next phase._

### Phase 2: Cluster Configuration

```bash
# Connect to cluster
aws eks update-kubeconfig --region us-east-1 --name ecommerce-cluster

# Initialize Cluster-wide resources
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/jenkins/agent-permission.yaml
```

### Phase 3: Database & Secret Management

Modify `kubernetes/secrets.yaml` with the RDS details from Terraform, then apply:

```bash
kubectl apply -f kubernetes/secrets.yaml
kubectl apply -f kubernetes/configmap.yaml
# Run the DB schema initialization
kubectl apply -f kubernetes/db-init-job.yaml
```

### Phase 4: CI/CD Execution

1. Access Jenkins via the LoadBalancer service in the `jenkins` namespace.
2. Add Docker Hub credentials (ID: `dockerhub-credentials`).
3. Create a Pipeline Job using `jenkins/Jenkinsfile_EKS.groovy`.
4. Run the build. It will build 3 images (Frontend, Product, Order) and deploy them to the `ecommerce` namespace.

### Phase 5: Monitoring Deployment

```bash
kubectl apply -f kubernetes/monitoring/prometheus.yaml
kubectl apply -f kubernetes/monitoring/grafana.yaml
```

---

## �️ Advanced Troubleshooting (Resolved Issues)

| Problem Area               | Solution Description                                                                               |
| :------------------------- | :------------------------------------------------------------------------------------------------- |
| **Jenkins CSRF 403**       | Resolved via `disable-csrf.groovy` which runs on Jenkins startup.                                  |
| **Kaniko "file exists"**   | Resolved by using unique `podTemplate` labels for every build stage in the Groovy pipeline.        |
| **RDS Connection**         | Resolved by adding a Security Group egress rule from EKS Nodes to RDS Private Subnets (Port 3306). |
| **Grafana Persistence**    | Configured via `grafana-dashboard-ecommerce` ConfigMap to ensure dashboards survive pod restarts.  |
| **Docker Hub Rate Limits** | Implemented authenticated pulls within the Kaniko executor config.                                 |

---

## � Repository Structure

```text
├── app/                  # Microservices Source Code (React, Node.js)
├── terraform/            # Infrastructure as Code (VPC, EKS, RDS)
├── kubernetes/           # YAML Manifests
│   ├── jenkins/          # Master Jenkins deployment & RBAC
│   ├── monitoring/       # Prometheus & Grafana setup
│   └── *.yaml            # Microservices & Config specs
└── jenkins/              # Groovy Pipeline Definitions
```

---

## 🧹 Cleanup

To avoid $40+ per day in AWS costs, always run:

```bash
cd terraform
terraform destroy -auto-approve
```

---

**Program**: DevOps & Microservices Specialization (M2)  
**Author**: Project Team  
**Environment**: AWS US-East-1 (North Virginia)
