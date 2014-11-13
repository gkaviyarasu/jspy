(ns profiler-util
  (:use [enhance-class])
  (:import
   [java.nio.channels FileChannel]
   [java.nio ByteBuffer]
   [java.io File])
  (:require [clojure.java.io :as io]))

(def curr-pos (atom 0))

(defn- increment-position [incrementBy]
  (swap! curr-pos (fn[n] (+ incrementBy n))))

(defn- reset-position []
  (reset! curr-pos 0))

(defn- accumulate-classes [fileLocation accumulator]
  (let [currFile (io/file fileLocation)]
    (do 
      (if (.isDirectory currFile)
        (concat accumulator (mapcat (fn[fileLocation] (accumulate-classes fileLocation '())) (.listFiles currFile)))
        (let [fileName (.getName currFile)]
          (if
              (or (.endsWith fileName ".class") (.endsWith fileName ".jar"))
            (conj accumulator currFile)
            accumulator))))))



(defn find-classes [fileLocations]
  (mapcat (fn[fileLocation] (accumulate-classes fileLocation '())) fileLocations))

(defn- instrument-class-stream [fileStream indexWriter classFileWriter]
  (let [instrumentedBytes (instrument-class (.getName file) )
        byteSize (alength instrumentedBytes)]
    (.write indexWriter (str (.getName file) " " @curr-pos " " (increment-position byteSize) "\n"))
    (.write classFileWriter instrumentedBytes)
    (.flush classFileWriter)
    file))

(defn- entries [jarFile]
  (enumeration-seq (.entries jarFile)))

(defn- instrument-jar [file indexWriter classFileWriter]
  (with-open [jarFile (java.util.jar.JarFile. file)]
    (doseq [jarEntry (enumeration-seq (.entries jarFile))]
      (with-open [jarStream (.getInputStream jarFile jarEntry)]
        (instrument-class-stream jarStream indexWriter classFileWriter))))


(defn instrument-classes [files]
  (let [indexFile (File/createTempFile "index" "blob")
        classFile (File/createTempFile "clasdef" "blob")]
    (do 
      (reset-position)
      (with-open [indexWriter (io/writer indexFile)
                  classFileWriter (io/output-stream classFile)]
        (doseq [file files] 
          (if (.endsWith (.getName file) ".class")
            (with-open [origClassFileStream (io/input-stream file)]
              (instrument-class-stream origClassFileStream indexWriter classFileWriter))
            (instrument-jar file indexWriter classFileWriter))))
      (.deleteOnExit indexFile)
      (.deleteOnExit classFile)
      (conj '() (.getAbsolutePath indexFile) (.getAbsolutePath classFile)))))

(comment
  (find-classes (conj '() (str (System/getProperty "user.dir") "/profiler/agent/target/"))))
