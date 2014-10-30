(ns local-profiler
  (:import 
   [java.net ServerSocket]
   [java.io File InputStream]
   [java.util.concurrent ArrayBlockingQueue]))

(def allThreadCommonLog (atom '()))
(defn- printA [message]
  (swap! allThreadCommonLog conj message))

(defn- on-thread [f]
  (doto (Thread. ^Runnable f)
    (.start)))

(defn- close-socket [^ServerSocket s]
  (when-not (.isClosed s)
    (.close s)))

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
    (loop [read (.read is buffer)]
      (when (> read 0)
        (do
          (printA (String. buffer 0 read))
          (.set-response profiler (String. buffer 0 read)))
          (recur (.read is buffer))))))

(defn- accept-connection [socket profiler]
  (on-thread #(
                  (let [conn (.accept socket)]
                    (write-output conn profiler)
                    (read-input (.getInputStream conn) profiler))))
  (print "started work to accept connections"))


(defn- load-agent [profiler profiledVm]
      (on-thread #(.loadAgent profiledVm
                (str (System/getProperty "user.dir") "/sandbox/jrunscriptin/target/custom-agent.jar")
                (.toString (.get-port profiler)))))

(defn- start-profiler-server [profiler]
  "starts the profiler server and return the profiler"
  (print "server port opened at " (.get-port profiler) "\n")
  (accept-connection (:socket profiler) profiler)
  profiler)

(defn- stop-profiler-server [profiler]
  "stops the profiler server and return the profiler"
  (close-socket (:socket profiler))
  profiler)

(defn- run-profiler-script [profiler]
  "runs the script from a target local folder"
  (close-socket (:socket profiler))
  (profiler))

(defprotocol Profiler
  (start-p [this profiledVM])
  (stop-p [this])
  (run-script [this])
  (get-port [this]))

(defprotocol AsyncCommandRunner
  (set-response [this response])
  (get-response [this])
  (get-command [this])
  (set-command [this command]))

(defrecord LocalProfiler [socket commandQ responseQ]
  Profiler
  (start-p [this profiledVM] 
    (start-profiler-server this)
    (load-agent this profiledVM))
  (stop-p [this] 
    (stop-profiler-server this))
  (run-script [this]
    (run-profiler-script this))
  (get-port [this] (.getLocalPort socket))

  AsyncCommandRunner
  (set-response [this response] (.offer (:responseQ this) response))
  (get-response [this] (.take (:responseQ this)))
  (set-command [this command] (.offer (:commandQ this) command))
  (get-command [this] (.take (:commandQ this))))



(defn create-profiler []
  (let [socket (ServerSocket. )]
    (.bind socket  nil)
    (LocalProfiler. socket (ArrayBlockingQueue. 10) (ArrayBlockingQueue. 10))))


(defn clear-logs []
  (reset! allThreadCommonLog '()))

(defn show-logs [] allThreadCommonLog)

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
