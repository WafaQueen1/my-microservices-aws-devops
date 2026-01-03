# EKS Cluster Configuration using LabRole
# This configuration is optimized for AWS Academy Learner Labs

resource "aws_eks_cluster" "main" {
  name = "${var.project_name}-cluster"

  # Using the pre-existing LabRole as required by AWS Academy
  role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole"

  vpc_config {
    subnet_ids = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
  }

  tags = {
    Name = "${var.project_name}-eks"
  }
}

# EKS Node Group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project_name}-node-group"
  node_role_arn   = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole"
  subnet_ids      = aws_subnet.private[*].id

  scaling_config {
    desired_size = var.worker_count
    max_size     = var.worker_count + 1
    min_size     = 1
  }

  instance_types = [var.worker_instance_type]

  # Ensure that IAM Role permissions are created before and deleted after EKS Node Group handling.
  # Otherwise, EKS will not be able to properly delete EC2 Instances and Elastic Network Interfaces.
  depends_on = [
    aws_eks_cluster.main
  ]

  tags = {
    Name = "${var.project_name}-node-group"
  }
}
