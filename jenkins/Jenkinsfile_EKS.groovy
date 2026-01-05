/*
 * E-Commerce Microservices - EKS Optimized Pipeline (Kaniko)
 * ==========================================================
 * This version uses Kaniko because EKS nodes use containerd (no Docker daemon).
 */

podTemplate(yaml: '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: kaniko
    image: gcr.io/kaniko-project/executor:debug
    command: ["sleep"]
    args: ["9999999"]
    volumeMounts:
    - name: docker-config
      mountPath: /kaniko/.docker
  volumes:
  - name: docker-config
    emptyDir: {}
''') {

    node(POD_LABEL) {
        stage('Checkout') {
            checkout scm
        }

        stage('Build & Push images') {
            container('kaniko') {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh "echo '{\"auths\":{\"https://index.docker.io/v1/\":{\"auth\":\"'$(echo -n ${DOCKER_USER}:${DOCKER_PASS} | base64)'\"}}}' > /kaniko/.docker/config.json"
                    
                    sh "/kaniko/executor --context ${env.WORKSPACE}/app/frontend --dockerfile ${env.WORKSPACE}/app/frontend/Dockerfile --destination=wafa20022025/ecommerce-frontend:latest"
                    sh "/kaniko/executor --context ${env.WORKSPACE}/app/product-service --dockerfile ${env.WORKSPACE}/app/product-service/Dockerfile --destination=wafa20022025/product-service:latest"
                    sh "/kaniko/executor --context ${env.WORKSPACE}/app/order-service --dockerfile ${env.WORKSPACE}/app/order-service/Dockerfile --destination=wafa20022025/order-service:latest"
                }
            }
        }

        stage('Deploy to EKS') {
            sh "kubectl apply -f kubernetes/product-service.yaml -n ecommerce"
            sh "kubectl apply -f kubernetes/order-service.yaml -n ecommerce"
            sh "kubectl apply -f kubernetes/frontend.yaml -n ecommerce"
        }
    }
}
