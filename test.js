import { readFile } from "fs/promises";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const fileBuffer = await readFile(
  "/home/dominik/Videos/github-unwrapped-Wissididom-20231224.mp4",
);

//const ffmpeg = spawn('ffmpeg', ['-i', 'pipe:0', 'pipe:1']);
const ffmpeg = spawn("ffmpeg", ["-i", "-", `${randomUUID()}.mkv`]);

ffmpeg.stdin.write(fileBuffer);
ffmpeg.stdin.end();

ffmpeg.stderr.pipe(process.stdout);
