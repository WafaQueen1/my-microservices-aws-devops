# EC2 instances for K3s Kubernetes cluster

# Get latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Key pair for SSH access (you'll need to create this in AWS console or import)
resource "aws_key_pair" "k3s" {
  key_name   = "${var.project_name}-k3s-key"
  public_key = var.ssh_public_key
}

# K3s Master Node
resource "aws_instance" "k3s_master" {
  ami                         = data.aws_ami.amazon_linux_2.id
  instance_type               = var.master_instance_type
  key_name                    = aws_key_pair.k3s.key_name
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.k3s_master.id]
  associate_public_ip_address = true

  root_block_device {
    volume_size = 30
    volume_type = "gp2"
  }

  # K3s installed manually - see README.md for instructions

  tags = {
    Name = "${var.project_name}-k3s-master"
    Role = "master"
  }

  depends_on = [aws_db_instance.main]
}

# K3s Worker Node
resource "aws_instance" "k3s_worker" {
  count                       = var.worker_count
  ami                         = data.aws_ami.amazon_linux_2.id
  instance_type               = var.worker_instance_type
  key_name                    = aws_key_pair.k3s.key_name
  subnet_id                   = aws_subnet.public[count.index % length(aws_subnet.public)].id
  vpc_security_group_ids      = [aws_security_group.k3s_worker.id]
  associate_public_ip_address = true

  root_block_device {
    volume_size = 30
    volume_type = "gp2"
  }

  # K3s installed manually - see README.md for instructions

  tags = {
    Name = "${var.project_name}-k3s-worker-${count.index + 1}"
    Role = "worker"
  }

  depends_on = [aws_instance.k3s_master]
}

# Security Group for K3s Master
resource "aws_security_group" "k3s_master" {
  name        = "${var.project_name}-k3s-master-sg"
  description = "Security group for K3s master node"
  vpc_id      = aws_vpc.main.id

  # SSH access
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Kubernetes API
  ingress {
    description = "Kubernetes API"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP for applications
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS for applications
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # NodePort range
  ingress {
    description = "NodePort Services"
    from_port   = 30000
    to_port     = 32767
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Flannel VXLAN
  ingress {
    description = "Flannel VXLAN"
    from_port   = 8472
    to_port     = 8472
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Kubelet metrics
  ingress {
    description = "Kubelet"
    from_port   = 10250
    to_port     = 10250
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # etcd
  ingress {
    description = "etcd"
    from_port   = 2379
    to_port     = 2380
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Allow all from workers
  ingress {
    description = "All from VPC"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-k3s-master-sg"
  }
}

# Security Group for K3s Workers
resource "aws_security_group" "k3s_worker" {
  name        = "${var.project_name}-k3s-worker-sg"
  description = "Security group for K3s worker nodes"
  vpc_id      = aws_vpc.main.id

  # SSH access
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # NodePort range
  ingress {
    description = "NodePort Services"
    from_port   = 30000
    to_port     = 32767
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All from VPC
  ingress {
    description = "All from VPC"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-k3s-worker-sg"
  }
}
