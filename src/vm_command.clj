(ns vm-command
  (:import 
   [sun.tools.jps Arguments Jps]
   [sun.jvmstat.monitor HostIdentifier MonitoredHost VmIdentifier MonitoredVmUtil]))

(defrecord VM [id mainClass args flags])

(defn list-vms [hostId]
  "lists all vms running on hostId like localhost"
  (let 
      [monitoredHost (MonitoredHost/getMonitoredHost (HostIdentifier. hostId))
       activeVMs (.activeVms monitoredHost)]
    (doall (map 
            (fn[vmid]
              (let [ vm (.getMonitoredVm monitoredHost (VmIdentifier. (str "//" vmid "?mode=r")) 0)] 
                (VM. vmid 
                     (MonitoredVmUtil/mainClass vm true) 
                     (MonitoredVmUtil/jvmArgs vm) 
                     (MonitoredVmUtil/jvmFlags vm))))
            activeVMs))))


()
