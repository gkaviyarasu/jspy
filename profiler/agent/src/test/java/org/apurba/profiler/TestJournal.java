package org.apurba.profiler;

import static org.junit.Assert.*;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.Writer;
import org.junit.Test;
import org.apurba.profiler.Agent.Journal;

public class TestJournal {

	@Test
	public void readIndexFile() throws Exception {
		String[] indexData = createIndexes(new String[] { "a", "bbc" });
		byte[] data = "sdfasd".getBytes();
		Journal journal = createJournal(indexData, data);
		assertTrue(journal.contains("a"));
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
}
