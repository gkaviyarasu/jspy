(ns spy-web
  (:use [compojure.core]
        [ring.middleware.json]
        [ring.util.response])
  (:require [clj-json.core :as json]
            [compojure.route :as route])

)

(def current-trace (atom {:data nil}))

(defn json-response [data & [status]]
  {:status (or status 200)
   :headers {"Content-Type" "application/json"}
   :body (json/generate-string data)})

(defroutes handler
  (GET "/" [] (json-response {"hello" "world"}))
  (PUT "/" [name] (json-response {"hello" name}))
  (GET "/start" [] (json-response {"hello" "world"}))
  (GET "/tree" [] (json-response {"response" "tree"}))
  (route/resources "/")
)

(defn set-current-trace [data]
  (swap! current-trace conj {:data data})
)

(def app
  (-> handler
    wrap-json-params))

