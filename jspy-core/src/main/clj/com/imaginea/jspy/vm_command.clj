(ns ^{:doc "vm-commmands used for attach, detach things apart from profiler work"}
      com.imaginea.jspy.vm-command
  (:use [com.imaginea.jspy.local-profiler])
  (:import 
   [sun.tools.jps Arguments Jps]
   [sun.jvmstat.monitor HostIdentifier MonitoredHost VmIdentifier MonitoredVmUtil]
   [com.sun.tools.attach VirtualMachine AttachNotSupportedException VirtualMachineDescriptor]
   [java.io File BufferedReader])
  (:require [clojure.java.io :as io]))

(def attachedVmManager (atom {}))

(def log-response-writer (atom nil))

(def log-response-reader (atom nil))

(defn- register-attached-vm [vmId profiledVm]
    (swap! attachedVmManager assoc vmId profiledVm))

(defn- deregister-attached-vm [vmId]
    (swap! attachedVmManager dissoc vmId))

(defn- log-to-file [message]
  (if-not (nil? @log-response-writer) 
    (do 
      (.write @log-response-writer (str message "\n"))
      (.flush @log-response-writer)))
  message)

(defn- open-response-logger[]
  (let [responseLog (File/createTempFile "response" "blob")]
    (do 
      (print (.getAbsolutePath responseLog))
      (io/writer responseLog))))

(defn- close-resource [resource]
  (.close resource))

(defn- open-response-reader [fileName]
  (BufferedReader. (io/reader fileName)))

(defn- playback-from-history []
  (.readLine @log-response-reader))

(defn get-profiler [vmId] (:profiler (get @attachedVmManager vmId)))

(defn- enhance-for-replay [vmId]
  (if-not (nil? @log-response-reader)
    (playback-from-history)
    (str "{\"timestamp\":" (System/currentTimeMillis) 
         ", \"response\":\""
    (if-not (nil? (get-profiler vmId))
      (log-to-file 
       (let [responseStr (.get-profiler-result (get-profiler vmId))]
         (if-not (nil? responseStr) responseStr "")))
      "No profiler attached for the given vmId") "\"}")))

(defrecord VM [id mainClass args flags commandLine])

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
                     (MonitoredVmUtil/jvmFlags vm)
                     (MonitoredVmUtil/commandLine vm))))
            activeVMs))))


(defn attach-vm 
  "attaches to the vm with the given vmid"
  [^String vmId]
  (let [profiledVm (VirtualMachine/attach vmId)
        profilee {:vm profiledVm :profiler (create-profiler)}]
    (register-attached-vm vmId profilee)
    (.start-agent (:profiler profilee) profiledVm)))

(defn detach-vm 
  "detaches the vm with given vmid"
  [^String vmId]
  (if (not (nil? (get @attachedVmManager vmId)))
    (do 
     (.detach (:vm (get @attachedVmManager vmId)))
     (.stop-agent (:profiler (get @attachedVmManager vmId)))
     (deregister-attached-vm vmId)
     vmId)))


(defn run-command-on-vm [^String vmId ^String command]
  (.run-command (get-profiler vmId) command))

(defn get-result-from-vm [^String vmId]
  (str "{\"timestamp\":" (System/currentTimeMillis) 
       ",\"response\": "
       (if-not (nil? (get-profiler vmId))
         (.get-result (get-profiler vmId))
          "\"No profiler attached for the given vmId\"")
       "}"))

(defn get-raw-result-from-vm [^String vmId]
    (enhance-for-replay vmId))
    

(defn profile-vm [^String vmId fileNames]
  (.profile-locations (get-profiler vmId) fileNames))

(defn unprofile-vm [^String vmId]
  (.unprofile (get-profiler vmId)))

(defn list-profiled-vms
  "Gets a list of vms which are currently being profiled"
  []
  (keys @attachedVmManager))

(defn profilers
  "utility method to get the profiled vms in shell"
  []
  attachedVmManager)

(defn toggle-response-logging
  "Toggle on or off profiling reponses logging"
  []
      (reset! log-response-writer
              (if (nil? @log-response-writer)
                (open-response-logger)
                (do 
                  (close-resource @log-response-writer)
                  nil))))



(defn toggle-response-replay 
  "toggles sending captured entries from src file as raw responses"
  [srcFileName]
  (reset! log-response-reader
          (if (nil? @log-response-reader)
            (open-response-reader srcFileName)
            (do
              (close-resource @log-response-reader)
              nil))))

