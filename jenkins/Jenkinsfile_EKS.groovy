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
    
    // Run builds sequentially to avoid Kaniko filesystem issues
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
                    echo "🚀 Preparing namespace and core resources..."
                    // Ensure namespace exists
                    sh "kubectl apply -f kubernetes/namespace.yaml"
                    
                    echo "📦 Deploying all services..."
                    // Apply all manifests in the kubernetes directory
                    // We apply them in a specific order: namespace (done), secrets/configmaps, then deployments
                    sh "kubectl apply -f kubernetes/secrets.yaml -n ecommerce"
                    sh "kubectl apply -f kubernetes/configmap.yaml -n ecommerce"
                    sh "kubectl apply -f kubernetes/product-service.yaml -n ecommerce"
                    sh "kubectl apply -f kubernetes/order-service.yaml -n ecommerce"
                    sh "kubectl apply -f kubernetes/frontend.yaml -n ecommerce"
                    
                    echo "🔍 Verifying rollout..."
                    sh "kubectl rollout status deployment/product-service -n ecommerce --timeout=60s"
                    sh "kubectl rollout status deployment/order-service -n ecommerce --timeout=60s"
                    sh "kubectl rollout status deployment/frontend -n ecommerce --timeout=60s"
                }
            }
        }
    }
}
