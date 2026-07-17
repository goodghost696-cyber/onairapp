import { useEffect, useRef } from 'react'

// Hand-written WebGL shader instead of a library (three.js/@react-three/fiber
// would add several hundred kB for a single animated background) — a raw
// canvas + GLSL fragment shader gets the same "moody animated gradient blob"
// look from https://shadergradient.co at near-zero bundle cost. Loaded via
// React.lazy from Landing.jsx so other screens never pay for this code.

const VERTEX_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAGMENT_SRC = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;

const vec3 color1 = vec3(1.0, 0.3137, 0.0196);   // #ff5005
const vec3 color2 = vec3(0.8588, 0.7333, 0.5843); // #dbba95
const vec3 color3 = vec3(0.8157, 0.7373, 0.8824); // #d0bce1

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  float t = u_time * 0.04;
  float ca = cos(t);
  float sa = sin(t);
  vec2 ruv = mat2(ca, -sa, sa, ca) * uv;
  ruv += vec2(-0.3, 0.05);

  float n = fbm(ruv * 1.6 + vec2(0.0, u_time * 0.03));
  float n2 = fbm(ruv * 2.2 - vec2(u_time * 0.02, 0.0));

  vec3 grad = mix(color1, color2, smoothstep(0.2, 0.8, n));
  grad = mix(grad, color3, smoothstep(0.35, 0.9, n2));

  float dist = length(uv);
  float falloff = smoothstep(0.95, 0.1, dist);
  vec3 col = grad * falloff * 0.55;

  float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.05;
  col += grain;

  gl_FragColor = vec4(col, 1.0);
}
`

function compileShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[ShaderBackground] shader compile error', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export default function ShaderBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC)
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)
    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[ShaderBackground] program link error', gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const positionLoc = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLoc)
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution')
    const timeLoc = gl.getUniformLocation(program, 'u_time')

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let rafId = null
    let startTime = performance.now()

    // Cap the internal render resolution — a full-DPR canvas on a modern
    // phone is more fragment-shader work than this background is worth.
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }

    function draw(now) {
      resize()
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height)
      gl.uniform1f(timeLoc, (now - startTime) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    function loop(now) {
      draw(now)
      rafId = requestAnimationFrame(loop)
    }

    resize()
    if (reducedMotion) {
      draw(performance.now())
    } else {
      rafId = requestAnimationFrame(loop)
    }

    function handleVisibility() {
      if (document.hidden) {
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
      } else if (!reducedMotion && rafId === null) {
        rafId = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('resize', resize)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('resize', resize)
      if (rafId !== null) cancelAnimationFrame(rafId)
      // Deliberately not forcing WEBGL_lose_context here: React StrictMode's
      // dev-only double-invoke (mount → cleanup → mount) would kill the
      // context before the second mount ever gets a usable one. The canvas
      // and its GL context are cheap enough to let the GC reclaim normally
      // once the element actually leaves the DOM.
    }
  }, [])

  return <canvas ref={canvasRef} className="shader-background" aria-hidden="true" />
}
