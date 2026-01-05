/*
 * E-Commerce Microservices - EKS Optimized Pipeline (Kaniko Multi-Pod)
 * ===================================================================
 * This version runs each build in its own pod to avoid Kaniko's filesystem corruption.
 */

def buildImage(String serviceName, String contextPath, String destination) {
    podTemplate(yaml: """
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
""") {
        node(POD_LABEL) {
            stage("Build ${serviceName}") {
                checkout scm
                container('kaniko') {
                    withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh """
                            mkdir -p /kaniko/.docker
                            AUTH=\$(echo -n "\${DOCKER_USER}:\${DOCKER_PASS}" | base64 | tr -d '\\n')
                            echo "{\\"auths\\":{\\"https://index.docker.io/v1/\\":{\\"auth\\":\\"\${AUTH}\\"}}}" > /kaniko/.docker/config.json
                            /kaniko/executor --context ${env.WORKSPACE}/${contextPath} --dockerfile ${env.WORKSPACE}/${contextPath}/Dockerfile --destination=${destination}
                        """
                    }
                }
            }
        }
    }
}

node {
    stage('Initialize') {
        cleanWs()
    }
    
    // Run builds sequentially
    buildImage('Frontend', 'app/frontend', 'wafa20022025/ecommerce-frontend:latest')
    buildImage('Product Service', 'app/product-service', 'wafa20022025/product-service:latest')
    buildImage('Order Service', 'app/order-service', 'wafa20022025/order-service:latest')

    podTemplate(yaml: '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: kubectl
    image: bitnami/kubectl:latest
    command: ["sleep"]
    args: ["9999999"]
''') {
        node(POD_LABEL) {
            stage('Deploy to EKS') {
                container('kubectl') {
                    sh "kubectl apply -f kubernetes/product-service.yaml -n ecommerce"
                    sh "kubectl apply -f kubernetes/order-service.yaml -n ecommerce"
                    sh "kubectl apply -f kubernetes/frontend.yaml -n ecommerce"
                }
            }
        }
    }
}
