package com.imaginea.profiler;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintStream;
import java.io.IOException;
import java.net.InetAddress;
import java.net.Socket;
import java.util.Arrays;
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import javax.script.ScriptException;

public class Agent {

    private static final String MAGIC_STRING = "\n------------End---------\n";

	public static void agentmain(String options) {
        try {
            int port = Integer.parseInt(options);
        
            Socket socket = new Socket(InetAddress.getLocalHost(), port);
            System.out.println("Now connected to the profiler");
            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), "UTF-8"));
            OutputStream os = socket.getOutputStream();
            OutputStreamWriter writer = new OutputStreamWriter(os);
            PrintStream errStream = new PrintStream(os, true);

            ScriptEngine engine = createEngine();
            setWriters(engine, writer);
            interactInLoop(engine, writer, reader, errStream, MAGIC_STRING);
        }catch(Exception exc) {
            exc.printStackTrace();
            throw new RuntimeException(exc);
        }
	}

    private static ScriptEngine createEngine() throws ScriptException {
		ScriptEngine engine = new ScriptEngineManager().getEngineByName("javascript");
		engine.eval("importPackage(java.lang)");
        return engine;
    }

    private static void setWriters(ScriptEngine engine, OutputStreamWriter w) {
		ScriptContext context = engine.getContext();
		context.setWriter(w);
		context.setErrorWriter(w);
    }

    private static void interactInLoop(ScriptEngine engine, OutputStreamWriter w, BufferedReader reader, PrintStream errStream, String boundary) throws IOException {
		String expr;
        System.out.println("Attached to profiler");
		while ((expr = reader.readLine()) != null) {
			try {
                if ("bye".equalsIgnoreCase(expr)) {
                    break;
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
			} catch(Exception e) {
                e.printStackTrace();
            }finally {
				w.flush();
			}
        }
        w.close();
        System.out.println("Disconnected from profiler");
    }
}
