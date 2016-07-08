(ns com.imaginea.jspy.spy
  (:use [compojure.core]
        [ring.middleware.params]
        [ring.middleware.json]
        [ring.util.response]
        [ring.util.mime-type]
        [ring.adapter.jetty]
        [com.imaginea.jspy.vm-command]
        )
  (:require [clj-json.core :as json]
            [compojure.route :as route])

)

(defn json-response [data & [status]]
  {:status (or status 200)
   :headers {"Content-Type" "application/json"}
   :body  data})

(defn convert-and-json-response [data & [status]]
  (json-response (json/generate-string data) status))

(defn- static-file-response [file-name]
  (file-response 
   (str
    (System/getProperty "user.dir") 
    "/../jspy-web/src/main/resources/" file-name)))

(defroutes handler 
  (GET "/" [] (redirect "/index.html"))
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

  (GET "/*" {{resource-path :*} :route-params}
       (some-> 
        ((apply some-fn [static-file-response resource-response]) resource-path)
        (content-type (ext-mime-type resource-path))))


  (route/resources "/" )
)


(def app
  (-> handler
    wrap-json-params wrap-params))

(defn- get-port[]
  (Integer/parseInt (System/getProperty "jetty.port" "8585")))

(defn start-server[]
  (run-jetty #'app {:port (get-port) :join? false}))

(defn exit-repl[]
  (System/exit 0))
