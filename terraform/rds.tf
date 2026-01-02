# RDS MySQL Configuration

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name        = "${var.project_name}-db-subnet-group"
  description = "Database subnet group for ${var.project_name}"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# RDS MySQL Instance
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-mysql"

  # Engine configuration
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  max_allocated_storage = 100  # Enable storage autoscaling up to 100GB

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  port     = 3306

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false  # Set to false for cost savings in dev

  # Storage configuration
  storage_type          = "gp2"
  storage_encrypted     = true

  # Backup configuration
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  # Performance and monitoring
  performance_insights_enabled = false  # Disabled for t3.micro
  monitoring_interval          = 0       # Basic monitoring only

  # Parameter group
  parameter_group_name = aws_db_parameter_group.main.name

  # Deletion protection (set to false for easy cleanup in dev)
  deletion_protection = false
  skip_final_snapshot = true

  tags = {
    Name = "${var.project_name}-mysql"
  }
}

# DB Parameter Group
resource "aws_db_parameter_group" "main" {
  name        = "${var.project_name}-mysql-params"
  family      = "mysql8.0"
  description = "MySQL parameter group for ${var.project_name}"

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "character_set_client"
    value = "utf8mb4"
  }

  parameter {
    name  = "max_connections"
    value = "100"
  }

  tags = {
    Name = "${var.project_name}-mysql-params"
  }
}
