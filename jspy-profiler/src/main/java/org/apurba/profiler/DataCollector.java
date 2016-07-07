package org.apurba.profiler;

public class DataCollector {
    private DataCollector() {
    }

    public static void start(String className, String methodName) {
        Agent.getInstance().publish("start", className, methodName);
    }

    public static void end(String className, String methodName) {
        Agent.getInstance().publish("end", className, methodName);
    }
}
