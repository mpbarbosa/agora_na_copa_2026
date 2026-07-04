import { useEffect, useRef } from "react";
import { buildFireworksPalette } from "../utils/teamCountdown";

const VERT_SRC = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Fragment shader: ballistic particle fireworks.
// Each burst spawns 24 primary sparks (fast, gravity) + 16 glitter (slow, twinkle).
// gl_FragCoord.y is 0 at bottom → bursts at y > 0.5 appear in the upper half.
const FRAG_SRC = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_orig[12];
uniform float u_t0[12];
uniform vec3 u_col[12];

float h1(float n) {
  return fract(sin(n) * 43758.5453);
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec3 c = vec3(0.0);
  float a = 0.0;

  for (int bi = 0; bi < 12; bi++) {
    float age = u_time - u_t0[bi];
    if (age < 0.0 || age > 4.6) continue;

    vec2 o = u_orig[bi] * u_res;
    vec3 col = u_col[bi];

    // Central flash (bright white, fades in first 0.2s) — larger + brighter
    float fl = max(0.0, 1.0 - age * 5.0);
    float fd = length(px - o);
    float fr = 72.0 * fl;
    float fi = (fr > 0.0) ? max(0.0, 1.0 - fd / fr) * fl : 0.0;
    c += vec3(1.0, 0.96, 0.75) * fi * 5.5;
    a = max(a, fi);

    // Primary sparks: fast radial launch + gravity (-100 px/s^2 effective)
    for (int pi = 0; pi < 24; pi++) {
      float s = float(bi * 31 + pi);
      float ang = h1(s * 1.3) * 6.28318;
      float spd = 120.0 + 230.0 * h1(s * 2.7);
      float delay = h1(s * 3.9) * 0.12;
      float t = max(0.0, age - delay);
      vec2 pos = o + vec2(cos(ang), sin(ang)) * spd * t + vec2(0.0, -100.0) * t * t;
      float d = length(px - pos);
      float fade = max(0.0, 1.0 - t / 4.0); fade = fade * fade;
      float r = 6.5 * fade + 0.7;
      float i = (r > 0.0) ? max(0.0, 1.0 - d / r) * fade : 0.0;
      c += col * i * 3.3;
      a = max(a, i);
    }

    // Glitter: slower, emerges later, twinkles — bigger + brighter
    for (int gi = 0; gi < 16; gi++) {
      float s = float(bi * 23 + gi + 200);
      float ang = h1(s * 2.1) * 6.28318;
      float spd = 40.0 + 85.0 * h1(s * 1.7);
      float delay = 0.3 + h1(s * 4.3) * 0.35;
      float t = max(0.0, age - delay);
      vec2 pos = o + vec2(cos(ang), sin(ang)) * spd * t + vec2(0.0, -50.0) * t * t;
      float d = length(px - pos);
      float fade = max(0.0, 1.0 - t / 3.6);
      float twink = 0.4 + 0.6 * abs(sin(u_time * 9.0 + s));
      float r = 4.0 * fade + 0.6;
      float i = (r > 0.0) ? max(0.0, 1.0 - d / r) * fade * twink : 0.0;
      c += mix(col, vec3(1.0), 0.55) * i * 1.5;
      a = max(a, i * 0.9);
    }
  }

  c = min(vec3(1.0), c);
  gl_FragColor = vec4(c, min(1.0, a));
}
`;

// 12 burst positions in normalised [0,1] coords (y=0 bottom, y=1 top in WebGL),
// spread across the upper screen for fuller coverage.
const ORIGINS: [number, number][] = [
  [0.18, 0.78], [0.50, 0.88], [0.82, 0.75],
  [0.30, 0.62], [0.68, 0.65], [0.12, 0.55],
  [0.88, 0.58], [0.50, 0.50], [0.38, 0.82],
  [0.62, 0.80], [0.25, 0.46], [0.75, 0.48],
];

// Stagger each burst 0.55s apart; last burst at 6.05s, fades by ~10.65s.
const START_TIMES = [
  0.0, 0.55, 1.1, 1.65, 2.2, 2.75, 3.3, 3.85, 4.4, 4.95, 5.5, 6.05,
];

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

interface Props {
  active: boolean;
  // The scoring team's colours — the fireworks palette is built from them. Defaults to the
  // Brazilian green/yellow when unset (no team chosen / colours unavailable).
  primaryColor?: string;
  secondaryColor?: string;
}

export function GoalFireworks({ active, primaryColor, secondaryColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl")
    ) as WebGLRenderingContext | null;
    if (!gl) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vert || !frag) {
      window.removeEventListener("resize", resize);
      return;
    }

    const prog = gl.createProgram();
    if (!prog) {
      window.removeEventListener("resize", resize);
      return;
    }
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      window.removeEventListener("resize", resize);
      return;
    }
    gl.useProgram(prog);

    // Full-screen quad (two triangles via TRIANGLE_STRIP)
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Set constant uniforms once — palette derived from the scoring team's colours.
    const palette = buildFireworksPalette(primaryColor, secondaryColor);
    gl.uniform2fv(gl.getUniformLocation(prog, "u_orig[0]"), new Float32Array(ORIGINS.flat()));
    gl.uniform1fv(gl.getUniformLocation(prog, "u_t0[0]"), new Float32Array(START_TIMES));
    gl.uniform3fv(gl.getUniformLocation(prog, "u_col[0]"), new Float32Array(palette.flat()));

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");

    // Additive blending so particles glow and overlap brightly
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 0);

    const t0 = performance.now();
    let rafId: number;

    const frame = () => {
      const t = (performance.now() - t0) / 1000;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteBuffer(quad);
    };
  }, [active, primaryColor, secondaryColor]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9998 }}
      data-testid="goal-fireworks"
    />
  );
}
