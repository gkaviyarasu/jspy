(ns com.imaginea.jspy.class-util)

(defrecord TrieNode [name children])

(defn- create-node[name]
  (TrieNode. name (atom {})))

(defn- add-child[parent name] 
  (let [children (:children parent)
        child (get @children name)]
    (if (nil? child)
      (let [new-child (create-node name)]
        (swap! children assoc  name new-child)
        new-child)
      child)))

(defn- add-children[names parent]
  (let [child-name (first names)]
    (if (nil? child-name)
      parent
      (add-children 
       (rest names)
       (add-child parent child-name)))))

(defn- create-trie[names delimiter]
  (let [root (create-node "root")]
    (doseq [name names]
        (add-children (.split name delimiter) root))
    root))


(defn- extract-common-path [node delimiter]
  (let [children  @(:children node)]
    (if (> (count children) 1)
      ""
      (let [first-child (second (first children))]
        (str (:name first-child) delimiter (extract-common-path first-child delimiter))))))

(defn extract-common-prefix [strings delimiter]
   (extract-common-path (create-trie strings delimiter) delimiter))
 
(comment
  (let [strings '("com/eventdb/eventservice" 
                  "com/eventdb/blahservice")]
    (extract-common-prefix strings "/")))
