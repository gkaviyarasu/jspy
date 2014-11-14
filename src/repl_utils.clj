(ns ^{:doc "Repl utilities"
       :author "Apurba Nath"}
  repl-utils
  (use [enhance-class]
       []))

(defn write-file [bytes fileName ]
   (with-open [w (java.io.BufferedOutputStream. (java.io.FileOutputStream. fileName))]
     (.write w bytes)))


(defn print-stack-trace
  "prints the first element in the common log as a regular stack trace" []
  (apply println 
         (map 
          #(str % "\n") 
          (cheshire.core/parse-string 
           (first @allThreadCommonLog)))))


(defn print-exception 
  "Prints the exception stack trace"
  []
  (loop [x @allThreadCommonLog]
    (let [y (first x)]
      (if-not (nil? y)
        (do 
          (if (.startsWith y "\t")
            (println y))
          (recur (rest x)))))))

(defn get-as-json [] 
  (cheshire.core/parse-string (add-records)))

(defn clean-str[command] (clojure.string/replace command "\n" " "))


(defn toInt[x] (Integer/parseInt x 16))

(defn toHex[x] (Integer/toHexString x))

(defn profile-vm 
  ;; handy method to try out profiling
  ([regex fileName]
     (profile-vm regex fileName (first (keys @(profilers)))))
  ([regex fileName vmId]
     (let 
         [instrumentedFiles (instrument-classes (find-classes (conj '() fileName)))
       profiler (get-profiler vmId)]
       (.set-command profiler (str "profile-classes " regex " " (second instrumentedFiles) " " (first instrumentedFiles))))))


(comment
  (write-file 
   (:bytes 
    (instrument-class 
     (clojure.java.io/input-stream 
      (str (System/getProperty "user.dir") 
           "/profiler/agent/target/test-classes/org/apurba/profiler/TestJournal.class")))) 
   "/tmp/xyz.class"))
