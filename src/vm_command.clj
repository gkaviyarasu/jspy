;; vm-commmands used for attach, detach things apart from profiler work
(ns vm-command
  (:use [local-profiler])
  (:import 
   [sun.tools.jps Arguments Jps]
   [sun.jvmstat.monitor HostIdentifier MonitoredHost VmIdentifier MonitoredVmUtil]
   [com.sun.tools.attach VirtualMachine AttachNotSupportedException VirtualMachineDescriptor]))

(def attachedVmManager (atom {}))

(defn- register-attached-vm [vmId profiledVm]
    (swap! attachedVmManager assoc vmId profiledVm))

(defn- deregister-attached-vm [vmId]
    (swap! attachedVmManager dissoc vmId))

(defn get-profiler [vmId] (:profiler (get @attachedVmManager vmId)))

(defrecord VM [id mainClass args flags])

(defn list-vms 
  "lists all vms running on localhost"
  []
  (let 
      [monitoredHost (MonitoredHost/getMonitoredHost (HostIdentifier. "localhost"))
       activeVMs (.activeVms monitoredHost)]
    (doall (map 
            (fn[vmid]
              (let [ vm (.getMonitoredVm monitoredHost (VmIdentifier. (str "//" vmid "?mode=r")) 0)] 
                (VM. vmid 
                     (MonitoredVmUtil/mainClass vm true) 
                     (MonitoredVmUtil/jvmArgs vm) 
                     (MonitoredVmUtil/jvmFlags vm))))
            activeVMs))))


(defn attach-vm 
  "attaches to the vm with the given vmid"
  [^String vmId]
  (let [profiledVm (VirtualMachine/attach vmId)
        profilee {:vm profiledVm :profiler (create-profiler)}]
    (register-attached-vm vmId profilee)
    (.start-p (:profiler profilee) profiledVm)))

(defn detach-vm 
  "detaches the vm with given vmid"
  [^String vmId]
  (if (not (nil? (get @attachedVmManager vmId)))
    (do 
     (.detach (:vm (get @attachedVmManager vmId)))
     (.stop-p (:profiler (get @attachedVmManager vmId)))
     (deregister-attached-vm vmId)
     vmId)))


(defn run-command-on-vm [^String vmId ^String command]
  (.run-command (get-profiler vmId) command))

(defn get-result-from-vm [^String vmId]
  (if-not (nil? (get-profiler vmId))
    (.get-result (get-profiler vmId) 10)
    (str "{\"response\":\"No profiler attached for the given vmId\"}")))

(defn list-profiled-vms
  "Gets a list of vms which are currently being profiled"
  []
  (keys @attachedVmManager))

(defn profilers
  "utility method to get the profiled vms in shell"
  []
  attachedVmManager)
