(ns spy
  (:use [compojure.core]
        [ring.middleware.params]
        [ring.middleware.json]
        [ring.util.response]
        [ring.adapter.jetty]
        [spy-command]
        [vm-command]
        )
  (:require [clj-json.core :as json]
            [compojure.route :as route])

)

(def current-trace (atom {:data nil}))

(defn build-exclude-list [excludes]
  (set (reduce concat
               (map (fn [[p cs]]
                      (map (fn [c] (str p "." c))
                           cs))
                    excludes))))

(def exclude-classes
  [["java.lang.reflect" ["*"]]
   ["org.apache.cassandra.serializer" ["AbstractTextSerializer" "TextSerializer"]]])


(defn json-response [data & [status]]
  {:status (or status 200)
   :headers {"Content-Type" "application/json"}
   :body  data})

(defn convert-and-json-response [data & [status]]
  {:status (or status 200)
   :headers {"Content-Type" "application/json"}
   :body  (json/generate-string data)})

(defn create-json [few-method-tree visited-nodes]
  (defn extract-relevant-part [x]
    {:id (:id x) :type "entry" :methodName (str (:method x)) :children  (map extract-relevant-part (:children x))})
  (binding [clj-json.core/*coercions* 
            {nodes.MethodEntryNode extract-relevant-part,
            nodes.MethodExitNode (fn[x] {:id (:id x) :type "exit"})}
            ]
    (json/generate-string few-method-tree)))

(defn set-current-trace [data]
  (swap! current-trace conj {:data data})
  (print "done")
)

(defroutes handler 
  (GET "/" [] (redirect "/index.html"))
  (POST "/debug" [action port classNamePattern] 
        (convert-and-json-response
         {"response" 
          (if (= action "start" )
            (do (spy-command/spy-on 
                 :host "localhost"
                 :port port
                 :classes classNamePattern
                 :exclude (build-exclude-list exclude-classes))
                (spy-command/start) "started")
            (do (spy-command/stop) 
                (set-current-trace 
                 (thread-grouped-method-tree 
                  (data)))"stopped"))}))
  (GET "/tree" [] 
       (json-response 
        (create-json (:data @current-trace) #{})))
  (GET "/vms" [] 
       (convert-and-json-response (list-vms)))
  (GET "/vms/attached" [] 
       (convert-and-json-response 
        (let [vms (list-profiled-vms)]
          (if (nil? vms) '() vms))))
  (POST "/vms/attach" [vmId] 
        (do 
          (attach-vm vmId) 
          (json-response vmId)))
  (POST "/vms/detach" [vmId] 
        (convert-and-json-response 
         (detach-vm vmId)))
  (POST "/vms/command" [vmId command] 
        (json-response 
         (str "{\"response\":" (run-command-on-vm vmId command) "}")))
  (GET "/vms/response" [vmId] 
       (json-response 
        (let [responseStr (get-result-from-vm vmId)] 
          (if (nil? responseStr) "try again" responseStr))))

  (GET "/vms/rawresponse" [vmId] 
       (json-response 
        (let [responseStr (get-raw-result-from-vm vmId)] 
          (if (nil? responseStr) "try again" responseStr))))

  (POST "/vms/profile" [vmId locations]
        (do 
          (profile-vm vmId locations)
          (json-response "{\"response\":\"done\"}")))

  (POST "/vms/unprofile" [vmId]
        (do 
          (unprofile-vm vmId)
          (json-response "{\"response\":\"done\"}")))
  (route/resources "/")
)


(def app
  (-> handler
    wrap-json-params wrap-params))

(defonce server (run-jetty #'app {:port 8585 :join? false}))
