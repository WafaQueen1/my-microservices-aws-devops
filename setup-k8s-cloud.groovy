import jenkins.model.*
import org.csanchez.jenkins.plugins.kubernetes.*

def instance = Jenkins.getInstance()
def clouds = instance.clouds
def k8sCloud = clouds.getByName("kubernetes")

if (k8sCloud == null) {
    println "Creating Kubernetes Cloud configuration..."
    def newK8sCloud = new KubernetesCloud("kubernetes")
    newK8sCloud.setServerUrl("https://kubernetes.default.svc.cluster.local")
    newK8sCloud.setNamespace("jenkins")
    newK8sCloud.setJenkinsUrl("http://jenkins.jenkins.svc.cluster.local:8080")
    newK8sCloud.setContainerCapStr("10")
    newK8sCloud.setRetentionTimeout(5)
    
    clouds.add(newK8sCloud)
    instance.save()
    println "Kubernetes Cloud 'kubernetes' added successfully."
} else {
    println "Kubernetes Cloud 'kubernetes' already exists."
}
