# E-Commerce Microservices on AWS

A microservices-based e-commerce application deployed on AWS using K3s, with CI/CD (Jenkins), monitoring (Prometheus/Grafana), and Infrastructure as Code (Terraform).

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        AWS Cloud (us-east-1)                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      VPC (10.0.0.0/16)                       │  │
│  │                                                              │  │
│  │   ┌────────────────────────────────────────────────────┐     │  │
│  │   │           K3s Cluster (3 EC2 Nodes)                │     │  │
│  │   │                                                    │     │  │
│  │   │   ┌──────────────────────────────────────────┐     │     │  │
│  │   │   │         Application Layer                │     │     │  │
│  │   │   │  ┌────────┐ ┌─────────┐ ┌─────────┐      │     │     │  │
│  │   │   │  │Frontend│ │Product  │ │ Order   │      │     │     │  │
│  │   │   │  │(React) │ │Service  │ │ Service │      │     │     │  │
│  │   │   │  │        │ │(Node.js)│ │(Node.js)│      │     │     │  │
│  │   │   │  └────────┘ └─────────┘ └─────────┘      │     │     │  │
│  │   │   └──────────────────────────────────────────┘     │     │  │
│  │   │                                                    │     │  │
│  │   │   ┌──────────────────────────────────────────┐     │     │  │
│  │   │   │         DevOps Layer                     │     │     │  │
│  │   │   │  ┌──────────┐ ┌───────┐ ┌───────┐        │     │     │  │
│  │   │   │  │Prometheus│ │Grafana│ │Jenkins│        │     │     │  │
│  │   │   │  │(metrics) │ └───────┘ └───────┘        │     │     │  │
│  │   │   │  └──────────┘                            │     │     │  │
│  │   │   └──────────────────────────────────────────┘     │     │  │
│  │   └────────────────────────────────────────────────────┘     │  │
│  │                            │                                 │  │
│  │                   ┌────────────────┐                         │  │
│  │                   │   RDS MySQL    │                         │  │
│  │                   │   (db.t3.micro)│                         │  │
│  │                   └────────────────┘                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    CloudWatch Dashboard                      │  │
│  │              (EC2 & RDS Metrics Visualization)               │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component          | Technology                      |
| ------------------ | ------------------------------- |
| **Infrastructure** | Terraform, AWS (EC2, VPC, RDS)  |
| **Kubernetes**     | K3s (lightweight K8s)           |
| **Frontend**       | React 18, Nginx                 |
| **Backend**        | Node.js 18, Express             |
| **Database**       | MySQL 8.0 (AWS RDS)             |
| **Monitoring**     | Prometheus, Grafana, CloudWatch |
| **CI/CD**          | Jenkins                         |

## Project Structure

```
├── terraform/              # AWS Infrastructure
│   ├── main.tf            # Provider config
│   ├── vpc.tf             # VPC & subnets
│   ├── ec2-k3s.tf         # EC2 instances
│   ├── rds.tf             # MySQL database
│   ├── cloudwatch.tf      # CloudWatch dashboard
│   └── variables.tf       # Variables
├── app/
│   ├── frontend/          # React app
│   ├── product-service/   # Product API
│   └── order-service/     # Order API
├── kubernetes/
│   ├── frontend.yaml
│   ├── product-service.yaml
│   ├── order-service.yaml
│   ├── secrets.yaml
│   ├── configmap.yaml
│   ├── monitoring/        # Prometheus & Grafana
│   └── jenkins/           # Jenkins CI/CD
├── jenkins/
    └── Jenkinsfile        # Pipeline definition

```

## Quick Start

### Prerequisites

- AWS Account (AWS Academy Learner Lab supported)
- Terraform >= 1.0.0
- Docker & Docker Hub account
- SSH key pair

### Step 1: Configure Terraform

```bash
git clone https://github.com/CheraHamza/Microservices-aws-application.git
cd Microservices-aws-application/terraform

# Generate SSH key (if needed)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/k3s-key

# Configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### Step 2: Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

This creates:

- VPC with public/private subnets
- 3 EC2 instances (1 master, 2 workers)
- RDS MySQL database
- Security groups

### Step 3: Install K3s on Master Node

```bash
# SSH into master
ssh -i ~/.ssh/k3s-key ec2-user@<MASTER_PUBLIC_IP>

# Install K3s (skip SELinux for Amazon Linux 2)
curl -sfL https://get.k3s.io | INSTALL_K3S_SKIP_SELINUX_RPM=true sh -s - server \
    --write-kubeconfig-mode=644 \
    --disable=traefik \
    --node-name="k3s-master"

# Setup kubectl
sudo mkdir -p /home/ec2-user/.kube
sudo cp /etc/rancher/k3s/k3s.yaml /home/ec2-user/.kube/config
sudo chown -R ec2-user:ec2-user /home/ec2-user/.kube
export KUBECONFIG=/home/ec2-user/.kube/config
echo 'export KUBECONFIG=/home/ec2-user/.kube/config' >> ~/.bashrc

# Get node token for workers
sudo cat /var/lib/rancher/k3s/server/node-token
```

### Step 4: Join Worker Nodes

SSH into each worker and run:

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_SKIP_SELINUX_RPM=true \
    K3S_URL=https://<MASTER_PRIVATE_IP>:6443 \
    K3S_TOKEN="<NODE_TOKEN>" sh -
```

Verify on master:

```bash
kubectl get nodes
# Should show 3 nodes: k3s-master + 2 workers
```

### Step 5: Create Database Tables

```bash
# On master node, connect to RDS
mysql -h <RDS_ENDPOINT> -P 3306 -u <DB_USER> -p<DB_PASSWORD> <DB_NAME>
```

```sql
CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    category VARCHAR(100),
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    shipping_address TEXT,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Insert sample products
INSERT INTO products (id, name, description, price, stock, category) VALUES
('prod-001', 'Wireless Headphones', 'High-quality wireless headphones', 99.99, 50, 'Electronics'),
('prod-002', 'Smart Watch', 'Fitness tracking smart watch', 199.99, 30, 'Electronics'),
('prod-003', 'Laptop Stand', 'Ergonomic aluminum laptop stand', 49.99, 100, 'Accessories');
```

### Step 6: Build and Push Docker Images

```bash
# On your local machine
docker login

docker build -t <DOCKERHUB_USER>/ecommerce-frontend:latest ./app/frontend
docker build -t <DOCKERHUB_USER>/product-service:latest ./app/product-service
docker build -t <DOCKERHUB_USER>/order-service:latest ./app/order-service

docker push <DOCKERHUB_USER>/ecommerce-frontend:latest
docker push <DOCKERHUB_USER>/product-service:latest
docker push <DOCKERHUB_USER>/order-service:latest
```

### Step 7: Update Kubernetes Manifests

Edit `kubernetes/secrets.yaml` with your RDS endpoint:

```yaml
stringData:
  DB_HOST: "<RDS_ENDPOINT>"
  DB_USER: "<DB_USER>"
  DB_PASSWORD: "<DB_PASSWORD>"
```

Update image names in `kubernetes/*.yaml` files with your Docker Hub username.

### Step 8: Deploy to Kubernetes

```bash
# Copy manifests to master
scp -i ~/.ssh/k3s-key -r ./kubernetes ec2-user@<MASTER_IP>:~/

# SSH into master and deploy
ssh -i ~/.ssh/k3s-key ec2-user@<MASTER_IP>

kubectl create namespace ecommerce
kubectl create namespace monitoring
kubectl create namespace jenkins

kubectl apply -f ~/kubernetes/secrets.yaml
kubectl apply -f ~/kubernetes/configmap.yaml
kubectl apply -f ~/kubernetes/product-service.yaml
kubectl apply -f ~/kubernetes/order-service.yaml
kubectl apply -f ~/kubernetes/frontend.yaml
kubectl apply -f ~/kubernetes/monitoring/
kubectl apply -f ~/kubernetes/jenkins/

# Verify
kubectl get pods --all-namespaces
```

### Step 9: Access the Application

| Service      | URL                       |
| ------------ | ----------------------    |
| **Frontend** | http://MASTER_IP          |
| **Grafana**  | http://MASTER_IP:NodePort |
| **Jenkins**  | http://MASTER_IP:NodePort |

Default credentials:

- Grafana: `admin` / `admin123`

## Monitoring

### Grafana

1. Access: `http://<MASTER_IP>:30090`
2. Login: `admin` / `admin123`
3. Add data source: **Prometheus** → URL: `http://prometheus:9090`
4. Import dashboard ID: **3662**

### CloudWatch

Terraform creates a CloudWatch dashboard with EC2 and RDS metrics.

Access: **AWS Console → CloudWatch → Dashboards → `ecommerce-dashboard`**

## Jenkins CI/CD

The pipeline performs real CI/CD: builds Docker images, pushes to Docker Hub, and deploys to Kubernetes.

### Setup Jenkins Tools

SSH into master and run:

```bash
# Install Docker on host
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo chmod 666 /var/run/docker.sock

# Get Jenkins pod
JENKINS_POD=$(kubectl get pod -n jenkins -l app=jenkins -o jsonpath="{.items[0].metadata.name}")

# Install Docker CLI in Jenkins (static binary, no root needed)
kubectl exec -it $JENKINS_POD -n jenkins -- bash -c "
cd /tmp &&
curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-24.0.7.tgz -o docker.tgz &&
tar xzvf docker.tgz &&
mkdir -p ~/bin &&
cp docker/docker ~/bin/ &&
rm -rf docker docker.tgz
"

# Install kubectl in Jenkins
kubectl exec -it $JENKINS_POD -n jenkins -- bash -c "
cd /tmp &&
curl -LO https://dl.k8s.io/release/v1.28.0/bin/linux/amd64/kubectl &&
chmod +x kubectl &&
mkdir -p ~/bin &&
mv kubectl ~/bin/
"

# Configure kubectl
kubectl exec -it $JENKINS_POD -n jenkins -- bash -c 'mkdir -p ~/.kube && printf "apiVersion: v1\nkind: Config\nclusters:\n- cluster:\n    certificate-authority: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt\n    server: https://kubernetes.default.svc\n  name: default\ncontexts:\n- context:\n    cluster: default\n    user: default\n  name: default\ncurrent-context: default\nusers:\n- name: default\n  user:\n    tokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token\n" > ~/.kube/config'

# Verify
kubectl exec -it $JENKINS_POD -n jenkins -- bash -c 'export PATH=$HOME/bin:$PATH && docker --version && kubectl get nodes'
```

### Configure Jenkins

1. Access: `http://<MASTER_IP>:NodePort`
2. Add Docker Hub credentials:
   - Manage Jenkins → Credentials → Add Credentials
   - Kind: Username with password
   - ID: `dockerhub-credentials`
   - Username: Your Docker Hub username
   - Password: Your Docker Hub token
3. Create pipeline:
   - New Item → Pipeline → `ecommerce-cicd`
   - Pipeline script from SCM → Git
   - Repository: `https://github.com/CheraHamza/Microservices-aws-application.git`
   - Script Path: `jenkins/Jenkinsfile`
4. Click **Build Now**

### Pipeline Stages

| Stage                | Action                     |
| -------------------- | -------------------------- |
| Checkout             | Clone repository           |
| Validate             | Check Dockerfiles exist    |
| Build Docker Images  | Build 3 images in parallel |
| Push to Docker Hub   | Push with build number tag |
| Deploy to Kubernetes | Rolling update deployments |
| Verify Deployment    | Show pod/service status    |

## Cleanup

```bash
# Delete Kubernetes resources
kubectl delete namespace ecommerce
kubectl delete namespace monitoring
kubectl delete namespace jenkins

# Destroy AWS infrastructure
cd terraform
terraform destroy
```

## AWS Learner Lab Notes

- K3s is used instead of EKS (IAM restrictions)
- Session timeout: 4 hours of inactivity
- Region: us-east-1
- RDS data persists across sessions
- After lab restart: run `terraform refresh` to get new IPs
