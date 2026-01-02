# Security Groups Configuration
# Note: K3s cluster security groups are defined in ec2-k3s.tf

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for RDS MySQL instance"
  vpc_id      = aws_vpc.main.id

  # Allow MySQL traffic from K3s master
  ingress {
    description     = "MySQL from K3s master"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.k3s_master.id]
  }

  # Allow MySQL traffic from K3s workers
  ingress {
    description     = "MySQL from K3s workers"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.k3s_worker.id]
  }

  # Allow MySQL traffic from within VPC (for debugging)
  ingress {
    description = "MySQL from VPC"
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}
