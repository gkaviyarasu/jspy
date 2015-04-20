(ns spy
  (:use [compojure.core]
        [ring.middleware.params]
        [ring.middleware.json]
        [ring.util.response]
        [ring.adapter.jetty]
        [vm-command]
        )
  (:require [clj-json.core :as json]
            [compojure.route :as route])

)

(defn json-response [data & [status]]
  {:status (or status 200)
   :headers {"Content-Type" "application/json"}
   :body  data})

(defn convert-and-json-response [data & [status]]
  {:status (or status 200)
   :headers {"Content-Type" "application/json"}
   :body  (json/generate-string data)})

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
  (route/resources "/")
)


(def app
  (-> handler
    wrap-json-params wrap-params))

(defonce server (run-jetty #'app {:port 8585 :join? false}))
