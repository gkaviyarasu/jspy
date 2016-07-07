(ns ^{:doc "Byte code magic to add entry exit methods"
       :author "Apurba Nath"}
  com.imaginea.jspy.enhance-class
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
  (proxy [MethodVisitor] [Opcodes/ASM4 delegate]
    (visitInsn [ inst]
      (do 
        ;; FIXME use switch this is ugly
        ;; miss cglib magic, this is stupid code
        (if (or (= inst Opcodes/ARETURN) (= inst Opcodes/DRETURN) (= inst  Opcodes/FRETURN) (= inst  Opcodes/IRETURN) (= inst  Opcodes/LRETURN) (= inst  Opcodes/RETURN) (= inst Opcodes/ATHROW)) 
          (add-entry-exit-code "end" this class-name method-name)))
      (.visitInsn delegate inst))
    (visitCode []
      (do 
        (add-entry-exit-code "start" this class-name method-name)
        (.visitCode delegate)))
    (visitAnnotationDefault []
      (.visitAnnotationDefault delegate))
    (visitAnnotation [ desc visible]
      (.visitAnnotation delegate desc visible))
    (visitParameterAnnotation [ parameter desc visible]
      (.visitParameterAnnotation delegate parameter desc visible))
    (visitAttribute [ attr]
      (.visitAttribute delegate attr))
    (visitFrame [ type nLocal local nStack stack]
      (.visitFrame delegate type nLocal local nStack stack))
    (visitIntInsn [ opcode operand]
      (.visitIntInsn delegate opcode operand))
    (visitVarInsn [ opcode var]
      (.visitVarInsn delegate opcode var))
    (visitTypeInsn [ opcode type]
      (.visitTypeInsn delegate opcode type))
    (visitFieldInsn [ opcode owner name desc]
      (.visitFieldInsn delegate opcode owner name desc))
    (visitMethodInsn [ opcode owner name desc]
      (.visitMethodInsn delegate opcode owner name desc))
    (visitJumpInsn [ opcode label]
      (.visitJumpInsn delegate opcode label))
    (visitLabel [ label]
      (.visitLabel delegate label))
    (visitLdcInsn [ cst]
      (.visitLdcInsn delegate cst))
    (visitIincInsn [ var increment]
      (.visitIincInsn delegate var increment))
    (visitTableSwitchInsn [ min max dflt labels]
      (.visitTableSwitchInsn delegate min max dflt labels))
    (visitLookupSwitchInsn [ dflt keys labels]
      (.visitLookupSwitchInsn delegate dflt keys labels))
    (visitMultiANewArrayInsn [ desc dims]
      (.visitMultiANewArrayInsn delegate desc dims))
    (visitTryCatchBlock [ start end handler type]
      (.visitTryCatchBlock delegate start end handler type))
    (visitLocalVariable [ name desc signature start end index]
      (.visitLocalVariable delegate name desc signature start end index))
    (visitLineNumber [ line start]
      (.visitLineNumber delegate line start))
    (visitMaxs [ maxstack maxLocals]
      (.visitMaxs delegate maxstack maxLocals))
    (visitEnd []
      (.visitEnd delegate))
))

;; visitMethod and visit are the only interesting methods
(defn create-perf-adding-class-visitor[delegate]
  (proxy [ClassVisitor] [Opcodes/ASM4 delegate]
    (visit [ version access name signature superName interfaces]
      (do 
        (reset! curr-class-name name)
        (.visit delegate  version access name signature superName interfaces)))
    (visitMethod [ access method-name desc singature exceptions] 
      (let [delegateMethodVisitor (.visitMethod delegate access method-name desc singature exceptions)]
        (if-not 
           (.equals method-name "<clinit>")
          (create-perf-adding-method-visitor delegateMethodVisitor @curr-class-name method-name)
          delegateMethodVisitor)))
    ;; stupid code starts
    (visitAnnotation [ x y]
      (.visitAnnotation delegate x y))
    (visitAttribute [ x]
      (.visitAttribute delegate x))
    (visitEnd []
      (.visitEnd delegate))
    (visitField [ x y z a b]
      (.visitField delegate x y z a b))
    (visitInnerClass [ x y z a]
      (.visitInnerClass delegate x y z a))
    (visitOuterClass [ x y z]
      (.visitOuterClass delegate x y z))
    (visitSource [ x y]
      (.visitSource delegate x y))))

(defn instrument-class [fileStream]
  (let [cw (ClassWriter. ClassWriter/COMPUTE_MAXS)
        cr (ClassReader.  fileStream)]
    (do
      (.accept cr (create-perf-adding-class-visitor cw) 0)
      (InstrumentedClass. @curr-class-name (.toByteArray cw)))))
