(ns spy-web
  (:use [compojure.core]
        [ring.middleware.json]
        [ring.util.response])
  (:require [clj-json.core :as json])
)

(defn json-response [data & [status]]
  {:status (or status 200)
   :headers {"Content-Type" "application/json"}
   :body (json/generate-string data)})

(defroutes handler
  (GET "/" []
    (json-response {"hello" "world"}))

  (PUT "/" [name]
    (json-response {"hello" name})))

(def app
  (-> handler
    wrap-json-params))

