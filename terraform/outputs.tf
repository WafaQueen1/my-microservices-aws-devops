# Terraform Outputs

# VPC Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

# K3s Cluster Outputs
output "k3s_master_public_ip" {
  description = "Public IP of the K3s master node"
  value       = aws_instance.k3s_master.public_ip
}

output "k3s_master_private_ip" {
  description = "Private IP of the K3s master node"
  value       = aws_instance.k3s_master.private_ip
}

output "k3s_worker_public_ips" {
  description = "Public IPs of K3s worker nodes"
  value       = aws_instance.k3s_worker[*].public_ip
}

output "k3s_worker_private_ips" {
  description = "Private IPs of K3s worker nodes"
  value       = aws_instance.k3s_worker[*].private_ip
}

# Security Group Outputs
output "k3s_master_security_group_id" {
  description = "Security group ID for K3s master"
  value       = aws_security_group.k3s_master.id
}

output "k3s_worker_security_group_id" {
  description = "Security group ID for K3s workers"
  value       = aws_security_group.k3s_worker.id
}

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "RDS instance address (hostname only)"
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

# Database connection string for applications
output "database_connection_info" {
  description = "Database connection information for applications"
  value = {
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    database = aws_db_instance.main.db_name
  }
}

# Helpful commands output
output "helpful_commands" {
  description = "Helpful commands to interact with the infrastructure"
  value = <<-EOT
    
    ============================================
    K3s CLUSTER ACCESS INSTRUCTIONS
    ============================================
    
    1. SSH into the master node:
       ssh -i <your-private-key.pem> ec2-user@${aws_instance.k3s_master.public_ip}
    
    2. Check cluster status (on master):
       kubectl get nodes
       kubectl get pods --all-namespaces
    
    3. Copy kubeconfig to your local machine:
       scp -i <your-private-key.pem> ec2-user@${aws_instance.k3s_master.public_ip}:/home/ec2-user/.kube/config ~/.kube/config-k3s
       
       Then update the server address in the config:
       sed -i 's/127.0.0.1/${aws_instance.k3s_master.public_ip}/g' ~/.kube/config-k3s
       export KUBECONFIG=~/.kube/config-k3s
    
    4. Access your application:
       http://${aws_instance.k3s_master.public_ip}:30080  (Frontend)
       http://${aws_instance.k3s_master.public_ip}:30090  (Grafana - admin/admin123)
       http://${aws_instance.k3s_master.public_ip}:30100  (Jenkins)
    
    5. RDS Connection (from within EC2):
       mysql -h ${aws_db_instance.main.address} -P ${aws_db_instance.main.port} -u admin -p

    6. CloudWatch (AWS Console):
       https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}
    
  EOT
}
