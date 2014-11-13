package org.apurba.profiler;

import java.io.BufferedReader;
import java.io.Closeable;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintStream;
import java.io.RandomAccessFile;
import java.lang.instrument.ClassFileTransformer;
import java.lang.instrument.Instrumentation;
import java.lang.instrument.UnmodifiableClassException;
import java.net.InetAddress;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.FileChannel.MapMode;
import java.security.ProtectionDomain;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.regex.Pattern;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import sun.nio.ch.DirectBuffer;

public class Agent {

	private static final String MAGIC_STRING = "\n------------End---------\n";

	private static final String PROFILE_CLASSES_CMD = "profile-classes";

	private static final String STOP_PROFILING_CMD = "stop-profiling";

	private static final String GET_ALL_ENTRIES = "get-all-entries";

	private static final Agent INSTANCE = new Agent();

	private Socket socket;

	private Instrumentation inst = null;

	private OndemandTransformer transformer;

	private Journal classJournal;

	private Queue<String[]> entryQueue = new ConcurrentLinkedQueue<>();

	private volatile boolean shouldProfile = false;

	public static Agent getInstance() {
		return INSTANCE;
	}

	public static void agentmain(String options, Instrumentation inst) {
		try {
			int port = Integer.parseInt(options);
			INSTANCE.inst = inst;
			INSTANCE.connect(port);
		} catch (Exception exc) {
			exc.printStackTrace();
			throw new RuntimeException(exc);
		}
	}

	public void publish(String... args) {
		if (shouldProfile) {
			entryQueue.add(args);
		}
	}

	private Agent() {
	}

	private void connect(int port) throws Exception {
		socket = new Socket(InetAddress.getLocalHost(), port);
		System.out.println("Now connected to the profiler");
		BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), "UTF-8"));
		OutputStream os = socket.getOutputStream();
		OutputStreamWriter writer = new OutputStreamWriter(os);
		PrintStream errStream = new PrintStream(os, true);

		ScriptEngine engine = createEngine();
		setWriters(engine, writer);
		interactInLoop(engine, writer, reader, errStream, MAGIC_STRING);
	}

	private ScriptEngine createEngine() throws ScriptException {
		ScriptEngine engine = new ScriptEngineManager().getEngineByName("javascript");
		engine.eval("importPackage(java.lang)");
		return engine;
	}

	private void setWriters(ScriptEngine engine, OutputStreamWriter w) {
		ScriptContext context = engine.getContext();
		context.setWriter(w);
		context.setErrorWriter(w);
	}

	private void interactInLoop(ScriptEngine engine, OutputStreamWriter w, BufferedReader reader,
			PrintStream errStream, String boundary) throws IOException {
		String expr;
		System.out.println("Attached to profiler");
		while ((expr = reader.readLine()) != null) {
			try {
				if (expr.startsWith("bye")) {
					break;
				} else if (expr.startsWith(PROFILE_CLASSES_CMD)) {
					profileClasses(expr);
				} else if (expr.startsWith(STOP_PROFILING_CMD)) {
					stopProfiling();
				} else if (expr.startsWith(GET_ALL_ENTRIES)) {
					writeAllEntries(w);
				} else {
					Object obj = engine.eval(expr);

					if (obj == null) {
						w.flush();
						continue;
					}
					String result = boundary + obj.toString() + boundary;
					w.write(result);
					w.flush();
				}
			} catch (ScriptException e) {
				e.printStackTrace(errStream);
				e.printStackTrace();
			} catch (Exception e) {
				e.printStackTrace();
			} finally {
				w.flush();
			}
		}
		w.close();
		socket.close();
		System.out.println("Disconnected from profiler");
	}

	private void profileClasses(String cmd) throws IOException {
		shouldProfile = true;
		String[] args = cmd.substring(PROFILE_CLASSES_CMD.length()).split(" ");
		if (args.length == 4) {
			// profile classes as first arg, index file name as second param and enhanced content as third param
			classJournal = new Journal(args[2], args[3]);
			transformer = new OndemandTransformer(args[1], classJournal);
			inst.addTransformer(transformer, true);
			transformer.retransformExistingClasses();
		} else {
			throw new RuntimeException("Did not understand the passed profiling cmd " + cmd);
		}
	}

	private void stopProfiling() throws IOException {
		shouldProfile = false;
		if (transformer != null) {
			inst.removeTransformer(transformer);
		}
		if (classJournal != null) {
			classJournal.close();
		}
	}

	private void writeAllEntries(OutputStreamWriter writer) throws Exception {
		Object[] entries = entryQueue.toArray();
		for (Object entry : entries) {
			String[] currEntries = (String[]) entry;
			for (String currEntry : currEntries) {
				writer.write(currEntry);
				writer.write(" ");
			}
			writer.write("\n");
		}
		writer.flush();
	}

	private class OndemandTransformer implements ClassFileTransformer {
		private Pattern classPattern;
		private Journal classJournal;

		private OndemandTransformer(String regex, Journal classJournal) {
			this.classPattern = Pattern.compile(regex);
			this.classJournal = classJournal;
		}

		public byte[] transform(ClassLoader loader, String className, Class<?> classBeingRedefined,
				ProtectionDomain protectionDomain, byte[] classfileBuffer) {
			return getBytes(className);
		}

		private byte[] getBytes(String className) {
			System.out.println("would have instrumented " + className);
			if (shouldInstrument(className)) {
				byte[] transformedBytes = getInstrumentedVersion(className);
				System.out.println("did instrument " + className);
				return transformedBytes;
			} else {
				return null;
			}
		}

		private boolean shouldInstrument(String className) {
			try {
				return classPattern.matcher(className).matches();
			} catch (Exception exc) {
				// sorry, but this better not fail as everything will collapse
				exc.printStackTrace();
				classPattern = Pattern.compile("match-nothing");
				return false;
			}
		}

		private byte[] getInstrumentedVersion(String className) {
			return classJournal.getBytes(className);
		}

		private void retransformExistingClasses() {
			// TODO: performance not thought of
			Class[] classes = inst.getAllLoadedClasses();
			List<Class> classToTransform = new ArrayList<>();
			for (Class clazz : classes) {
				// class loader is null, so it is system class, so don't mess with it
				if (clazz.getClassLoader() != null && shouldInstrument(clazz.getName().replace('.', '/'))) {
					classToTransform.add(clazz);
				}
			}
			if (classToTransform.size() > 0) {
				Class[] clazzArr = new Class[classToTransform.size()];
				clazzArr = classToTransform.toArray(clazzArr);
				// don't want to mess with logging
				System.out.println("About to instrument " + clazzArr.length);
				try {
					inst.retransformClasses(clazzArr);
				} catch (UnmodifiableClassException exc) {
					// not calling inst.isModifiableClass, risking it
					// FIXME : must inform the profiler
					exc.printStackTrace();
				}
			} else {
				System.out.println("Did not instrument even a single class");
			}
		}
	}

	private static class Range {
		private int start;
		private int end;

		private Range(String start, String end) {
			this.start = Integer.parseInt(start);
			this.end = Integer.parseInt(end);
		}

		public int length() {
			return end - start;
		}
	}

	protected static class Journal implements Closeable {
		private Map<String, Range> index = new HashMap<>();
		private ByteBuffer dataBuffer;
		private RandomAccessFile dataFile;

		protected Journal(String indexFileName, String dataFileName) throws IOException {
			BufferedReader reader = new BufferedReader(new FileReader(indexFileName));
			String line = null;
			while ((line = reader.readLine()) != null) {
				String[] vals = line.split(" ");
				index.put(vals[0], new Range(vals[1], vals[2]));
			}
			reader.close();
			dataFile = new RandomAccessFile(dataFileName, "r");
			FileChannel fc = dataFile.getChannel();
			dataBuffer = fc.map(MapMode.READ_ONLY, 0, fc.size());
		}

		protected byte[] getBytes(String key) {
			Range dataRange = index.get(key);
			if (dataRange != null) {
				byte[] dst = new byte[dataRange.length()];
				try {
					dataBuffer.position(dataRange.start);
					dataBuffer.get(dst, 0, dataRange.length());
					return dst;
				} catch (IndexOutOfBoundsException exc) {
					exc.printStackTrace();
					throw new RuntimeException(exc);
				}
			} else {
				return null;
			}
		}

		protected boolean contains(String key) {
			return index.containsKey(key);
		}

		@Override
		public void close() throws IOException {
			if (dataFile != null) {
				dataFile.close();
			}
			// FIXME non-standard way of cleaning dataBuffer
			if (dataBuffer instanceof DirectBuffer) {
				sun.misc.Cleaner cleaner = ((DirectBuffer) dataBuffer).cleaner();
				cleaner.clean();
			}
		}
	}
}
