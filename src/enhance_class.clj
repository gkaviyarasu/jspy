(ns ^{:doc "Byte code magic to add entry exit methods"
       :author "Apurba Nath"}
  enhance-class
  (import [clojure.asm ClassReader ClassVisitor ClassWriter Opcodes MethodVisitor]))

(defrecord InstrumentedClass [name bytes])

(def curr-class-name (atom ""))

(defn- add-entry-exit-code [stage writer class-name method-name]
  (do 
    ;; (println (str "adding " stage ))
    (.visitLdcInsn writer class-name)
    (.visitLdcInsn writer method-name)
    (.visitMethodInsn writer Opcodes/INVOKESTATIC "org/apurba/profiler/DataCollector" stage "(Ljava/lang/String;Ljava/lang/String;)V")))


(defn create-perf-adding-method-visitor [delegate class-name method-name]
  (reify MethodVisitor
    (visitInsn [this inst]
      (do 
        ;; FIXME use switch this is ugly
        ;; miss cglib magic, this is stupid code
        (if (or (= inst Opcodes/ARETURN) (= inst Opcodes/DRETURN) (= inst  Opcodes/FRETURN) (= inst  Opcodes/IRETURN) (= inst  Opcodes/LRETURN) (= inst  Opcodes/RETURN) (= inst Opcodes/ATHROW)) 
          (add-entry-exit-code "end" this class-name method-name)))
      (.visitInsn delegate inst))
    (visitCode [this]
      (do 
        (add-entry-exit-code "start" this class-name method-name)
        (.visitCode delegate)))
    (visitAnnotationDefault [this]
      (.visitAnnotationDefault delegate))
    (visitAnnotation [this desc visible]
      (.visitAnnotation delegate desc visible))
    (visitParameterAnnotation [this parameter desc visible]
      (.visitParameterAnnotation delegate parameter desc visible))
    (visitAttribute [this attr]
      (.visitAttribute delegate attr))
    (visitFrame [this type nLocal local nStack stack]
      (.visitFrame delegate type nLocal local nStack stack))
    (visitIntInsn [this opcode operand]
      (.visitIntInsn delegate opcode operand))
    (visitVarInsn [this opcode var]
      (.visitVarInsn delegate opcode var))
    (visitTypeInsn [this opcode type]
      (.visitTypeInsn delegate opcode type))
    (visitFieldInsn [this opcode owner name desc]
      (.visitFieldInsn delegate opcode owner name desc))
    (visitMethodInsn [this opcode owner name desc]
      (.visitMethodInsn delegate opcode owner name desc))
    (visitJumpInsn [this opcode label]
      (.visitJumpInsn delegate opcode label))
    (visitLabel [this label]
      (.visitLabel delegate label))
    (visitLdcInsn [this cst]
      (.visitLdcInsn delegate cst))
    (visitIincInsn [this var increment]
      (.visitIincInsn delegate var increment))
    (visitTableSwitchInsn [this min max dflt labels]
      (.visitTableSwitchInsn delegate min max dflt labels))
    (visitLookupSwitchInsn [this dflt keys labels]
      (.visitLookupSwitchInsn delegate dflt keys labels))
    (visitMultiANewArrayInsn [this desc dims]
      (.visitMultiANewArrayInsn delegate desc dims))
    (visitTryCatchBlock [this start end handler type]
      (.visitTryCatchBlock delegate start end handler type))
    (visitLocalVariable [this name desc signature start end index]
      (.visitLocalVariable delegate name desc signature start end index))
    (visitLineNumber [this line start]
      (.visitLineNumber delegate line start))
    (visitMaxs [this maxstack maxLocals]
      (.visitMaxs delegate maxstack maxLocals))
    (visitEnd [this]
      (.visitEnd delegate))
))

;; visitMethod and visit are the only interesting methods
(defn create-perf-adding-class-visitor[delegate]
  (reify ClassVisitor 
    (visit [this version access name desc singature exceptions]
      (do 
        (reset! curr-class-name name)
        (.visit delegate  version access name desc singature exceptions)))
    (visitMethod [this access method-name desc singature exceptions] 
      (let [delegateMethodVisitor (.visitMethod delegate access method-name desc singature exceptions)]
        (if-not 
           (.equals method-name "<clinit>")
          (create-perf-adding-method-visitor delegateMethodVisitor @curr-class-name method-name)
          delegateMethodVisitor)))
    ;; stupid code starts
    (visitAnnotation [this x y]
      (.visitAnnotation delegate x y))
    (visitAttribute [this x]
      (.visitAttribute delegate x))
    (visitEnd [this]
      (.visitEnd delegate))
    (visitField [this x y z a b]
      (.visitField delegate x y z a b))
    (visitInnerClass [this x y z a]
      (.visitInnerClass delegate x y z a))
    (visitOuterClass [this x y z]
      (.visitOuterClass delegate x y z))
    (visitSource [this x y]
      (.visitSource delegate x y))))

(defn instrument-class [fileStream]
  (let [cw (ClassWriter. ClassWriter/COMPUTE_MAXS)
        cr (ClassReader.  fileStream)]
    (do
      (.accept cr (create-perf-adding-class-visitor cw) 0)
      (InstrumentedClass. @curr-class-name (.toByteArray cw)))))
