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

# EKS Cluster Outputs
output "eks_cluster_name" {
  description = "The name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "The endpoint for the EKS cluster"
  value       = aws_eks_cluster.main.endpoint
}

output "eks_cluster_certificate_authority" {
  description = "The certificate authority for the EKS cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

# Security Group Outputs
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
output "helpful_instructions" {
  description = "Instructions to interact with the infrastructure"
  value       = <<-EOT
    
    ============================================
    EKS CLUSTER ACCESS INSTRUCTIONS
    ============================================
    
    1. Update your local kubeconfig:
       aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main.name}
    
    2. Verify cluster access:
       kubectl get nodes
    
    3. RDS Connection (for debugging):
       Endpoint: ${aws_db_instance.main.endpoint}
       Database: ${aws_db_instance.main.db_name}
    
    4. CloudWatch (AWS Console):
       https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}
    
  EOT
}
