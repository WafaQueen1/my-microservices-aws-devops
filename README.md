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

## 🛠️ Technical Challenges & Deep-Dive Solutions

This project survived several critical technical hurdles. Below is the documentation of how we solved them.

### 1. Jenkins "403 Forbidden" (CSRF Protection)

**Problem**: Modern Jenkins versions enforce Strict CSRF protection, which blocks the Jenkins Agent from communicating back to the Master when running inside EKS LoadBalancers.
**Solution**: We implemented an automated Groovy hook in `init.groovy.d`.

```groovy
// disable-csrf.groovy
import jenkins.model.*
import hudson.security.*
def instance = Jenkins.getInstance()
instance.setCrumbIssuer(null) // Disables the crumb requirement
instance.save()
```

_Implementation: This script is automatically injected via a Kubernetes ConfigMap and mounted into the Jenkins home directory._

### 2. Kaniko "File Exists" & Workspace Corruption

**Problem**: Parallel builds (Frontend, Product, Order) in a single Jenkins agent caused Kaniko to attempt to reuse the same `/workspace`, leading to "directory already exists" or "checksum mismatch" errors.
**Solution**: We shifted to a **Dynamic Multi-Pod Strategy** in the `Jenkinsfile_EKS.groovy`.

```groovy
def buildImage(String serviceName, String contextPath, String destination) {
    // Generate a unique label for every single build
    def podLabel = "kaniko-${serviceName.toLowerCase().replace(' ', '-')}"
    podTemplate(label: podLabel, cloud: 'kubernetes', yaml: podYaml) {
        node(podLabel) {
            // Build logic isolated to this ephemeral pod
        }
    }
}
```

_Result: Each microservice now builds in its own isolated filesystem, ensuring 100% clean workspaces._

### 3. EKS RBAC Permission Denied

**Problem**: The default Jenkins agent service account lacked permissions to create "Deployments" or "Services" in the `ecommerce` namespace.
**Solution**: We created a dedicated `ClusterRole` and `ClusterRoleBinding` specifically for the Jenkins service account.

```yaml
# agent-permission.yaml
kind: ClusterRoleBinding
metadata:
  name: jenkins-agent-binding
subjects:
  - kind: ServiceAccount
    name: default
    namespace: jenkins
roleRef:
  kind: ClusterRole
  name: jenkins-cluster-role # Grants apps/* and core/* permissions
```

### 4. RDS "Connection Timed Out" (The Security Group Trap)

**Problem**: Application pods could not reach the database even though both were in the same VPC.
**Solution**: We cross-referenced Security Groups in Terraform. We explicitly allowed the **EKS Node Security Group** to access the **RDS Security Group** on port 3306.

```hcl
# security-groups.tf
resource "aws_security_group_rule" "eks_to_rds" {
  type                     = "ingress"
  from_port                = 3306
  to_port                  = 3306
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}
```

### 5. AWS Academy "LabRole" Limitations

**Problem**: Standard IAM role creation fails in AWS Academy due to `iam:CreateRole` restrictions.
**Solution**: We hardcoded the Amazon-provided `LabRole` into the EKS and RDS configurations, avoiding the need for Terraform to create new IAM roles.

### 6. Grafana Dashboard Persistence

**Problem**: By default, Grafana stores dashboards in an internal SQLite database which is lost upon pod restart.
**Solution**: We implemented "Dashboard-as-Code" using Kubernetes ConfigMaps.

```yaml
# grafana.yaml
volumeMounts:
  - name: grafana-dashboard-ecommerce
    mountPath: /var/lib/grafana/dashboards # Dashboards are side-loaded here
```

_Effect: Even if the Grafana pod dies, the E-Commerce dashboard is automatically reloaded from the ConfigMap on the next boot._

### 7. Private RDS Seeding (The Connectivity Barrier)

**Problem**: The database is in an isolated private subnet. Developers cannot connect to it from their local machine to run initial `CREATE TABLE` scripts.
**Solution**: We used a **Kubernetes Job** (`db-init-job.yaml`) to run the initialization _inside_ the VPC.

```bash
# Executing the seeding inside the cluster
kubectl apply -f kubernetes/db-init-job.yaml
```

_Logic: Since the K8s nodes have network access to the RDS, the job can securely execute the SQL script without exposing the DB to the internet._

---

## 📁 Repository Structure

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
