package org.apurba.profiler;

import static org.junit.Assert.*;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.Writer;
import org.apurba.profiler.Agent.Journal;
import org.junit.Test;

public class TestJournal {

	@Test
	public void readIndexFile() throws Exception {
		String[] indexData = createIndexes(new String[] { "a", "bbc" });
		byte[] data = "sdfasd".getBytes();
		Journal journal = createJournal(indexData, data);
		assertTrue(journal.contains("a"));
	}

	@Test
	public void testClassValidity() throws Exception {
		String classDef = this.getClass().getResource("/classdefblob").getPath();
		String indexFile = this.getClass().getResource("/indexblob").getPath();
		Journal journal = new Journal(indexFile, classDef);
		ClassLoader customCL = new ByteClassLoader(Thread.currentThread().getContextClassLoader(), journal);
		Class<?> customClass = customCL.loadClass("com.eventdb.EventUser");
		assertNotNull(customClass.getMethods());
	}

	private File createIndexFileWithData(String[] indexInfo) throws Exception {
		File indexFile = createTempFile("test");
		Writer writer = new BufferedWriter(new FileWriter(indexFile));
		for (String index : indexInfo) {
			writer.write(index);
			writer.write("\n");
		}
		writer.close();
		return indexFile;
	}

	private File createTempFile(String prefix) throws IOException {
		File indexFile = File.createTempFile(prefix, "txt");
		indexFile.deleteOnExit();
		return indexFile;
	}

	private File createDataFileWithData(byte[] data) throws IOException {
		File dataFile = createTempFile("data");
		FileOutputStream fos = new FileOutputStream(dataFile);
		fos.write(data);
		fos.close();
		return dataFile;
	}

	private String[] createIndexes(String[] keys) {
		String[] indexData = new String[keys.length];
		for (int i = 0; i < keys.length; i++) {
			indexData[i] = keys[i] + " " + i * 2 + " " + (i + 1) * 2;
		}
		return indexData;
	}

	private Journal createJournal(String[] indexData, byte[] data) throws Exception {
		File indexFile = createIndexFileWithData(indexData);
		String indexFileName = indexFile.getAbsolutePath();
		String dataFileName = createDataFileWithData(data).getAbsolutePath();
		return new Journal(indexFileName, dataFileName);
	}

	private static class ByteClassLoader extends ClassLoader {

		private Journal journal;

		public ByteClassLoader(ClassLoader parent, Journal journal) {
			super(parent);
			this.journal = journal;
		}

		@Override
		protected Class<?> findClass(final String name) throws ClassNotFoundException {
			byte[] classBytes = journal.getBytes(name.replace('.', '/'));
			if (classBytes != null) {
				return defineClass(name, classBytes, 0, classBytes.length);
			}
			return super.findClass(name);
		}
	}
}
