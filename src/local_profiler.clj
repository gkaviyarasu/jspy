(ns local-profiler
  (:import 
   [java.net ServerSocket SocketException]
   [java.io File InputStream Closeable]
   [java.util.concurrent ArrayBlockingQueue TimeUnit]))

(def allThreadCommonLog (atom '()))
(def msgBoundary (atom "\n------------End---------\n"))
(defn- printA [message]
  (swap! allThreadCommonLog conj message))

(defn- on-thread [f]
  (doto (Thread. ^Runnable f)
    (.start)))

(defn- close-socket [^Closeable s]
  (try 
    (if-not (nil? s)
      (.close s))
    (catch Exception e (.stackTrace e))))

(defn- write-output [conn profiler]
  (do 
  (on-thread 
   #(
     (let [os (.getOutputStream conn)]
       (do
         (loop [command (.get-command profiler)]
           (if-not (nil? command)
             (do
               (printA (str "writing to stream " command))
               (.write os (.getBytes (str (clojure.string/replace command "\n" " ") " \n")))
               (.flush os)
               (recur (.get-command profiler)))
             (printA "noting to write")))))))))

(defn- read-input [is profiler]
  (let [buffer (byte-array 4096)]
    (try 
      (loop [read (.read is buffer)]
        (when (> read 0)
          (do
            (printA (String. buffer 0 read))
            (.set-response profiler (String. buffer 0 read)))
          (recur (.read is buffer))))
      (catch SocketException e (print "Socket closed from other side, time to go")))))

(defn- accept-connection [socket profiler]
  (on-thread #(
               (try
                  (let [conn (.accept socket)]
                    (reset! (:connection profiler) conn)
                    (write-output conn profiler)
                    (read-input (.getInputStream conn) profiler))
               (catch NullPointerException e (print "something was closed making the other guys null here")))))
  (print "started work to accept connections"))


(defn- load-agent [profiler profiledVm]
      (on-thread #(.loadAgent profiledVm
                (str (System/getProperty "user.dir") "/profiler/agent/target/custom-agent.jar")
                (.toString (.get-port profiler)))))

(defn- start-profiler-server [profiler]
  "starts the profiler server and return the profiler"
  (print "server port opened at " (.get-port profiler) "\n")
  (accept-connection (:socket profiler) profiler)
  profiler)

(defn- stop-profiler-server [profiler]
  "stops the profiler server and return the profiler"
  (do
    (.set-command profiler "bye")
    (close-socket @(:connection profiler))
    (close-socket (:socket profiler))
    profiler))

(defn- combine-all[x] 
  (if-not (nil? (.peek x)) 
    (let [y (.poll x)]
      ( str y (combine-all x)))))

(defn clear-logs []
  (reset! allThreadCommonLog '()))

(defn show-logs [] allThreadCommonLog)

(defn- add-records
  ([]  
     (add-records 
      (filter 
       (fn[y](not (.startsWith y "writing to stream"))) 
       @allThreadCommonLog)))
  ([x] 
     (if-not (nil? x) 
       (str (last x) 
            (add-records (butlast x))) "")))

(defn- get-well-formed-response [response-str]
  (let [boundary "\n------------End---------\n"]
    (if (and (.startsWith response-str boundary) 
             (.endsWith response-str boundary))
      (subs response-str (.length boundary) (- (.length response-str) (.length boundary)))
      nil)))

(defprotocol Profiler
  (start-p [this profiledVM])
  (stop-p [this])
  (run-command [this command])
  (get-result [this waitTime])
  (get-port [this]))

(defprotocol AsyncCommandRunner
  (set-response [this response])
  (get-response [this])
  (get-command [this])
  (set-command [this command]))

(defrecord LocalProfiler [socket connection commandQ responseQ lastIncompleteResponse]

  AsyncCommandRunner
  (set-response [this response] (.offer (:responseQ this) response))
  (get-response [this] (.take (:responseQ this)))
  (set-command [this command] (.offer (:commandQ this) command))
  (get-command [this] (.take (:commandQ this)))

  Profiler
  (start-p [this profiledVM] 
    (.set-command this (slurp (str (System/getProperty "user.dir") "/profiler/commands/basicInfo.js")))
    (start-profiler-server this)
    (load-agent this profiledVM))
  (stop-p [this] 
    (stop-profiler-server this))
  (run-command [this command]
    (do 
      (.clear responseQ)
      (reset! lastIncompleteResponse "")
      (.set-command this command)))
  (get-result [this waitTime]
    (let [resultTillNow (str @lastIncompleteResponse (combine-all responseQ))]
      (if (nil? (get-well-formed-response resultTillNow))
        (do
          (reset! lastIncompleteResponse resultTillNow)
          nil)
        
        (do 
          (reset! lastIncompleteResponse "")
          (get-well-formed-response resultTillNow)))))
  (get-port [this] (.getLocalPort socket)))




(defn create-profiler []
  (let [socket (ServerSocket. )]
    (.bind socket  nil)
    (LocalProfiler. socket (atom nil) (ArrayBlockingQueue. 10) (ArrayBlockingQueue. 10) (atom ""))))


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
