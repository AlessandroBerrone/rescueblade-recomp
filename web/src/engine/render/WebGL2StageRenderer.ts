import { computeQuadProjectiveFactors, computeSpriteCorners, sortSpritesForRender } from './quadMath.ts';
import { DIRECTOR_INK, type RenderSprite, type TextureEntry } from './types.ts';

const VERT_SRC = `#version 300 es
precision highp float;
in vec2 a_pos;
in vec3 a_uvq;
uniform vec2 u_stageSize;
out vec3 v_uvq;
void main() {
  vec2 ndc = vec2(
    (a_pos.x / u_stageSize.x) * 2.0 - 1.0,
    1.0 - (a_pos.y / u_stageSize.y) * 2.0
  );
  gl_Position = vec4(ndc, 0.0, 1.0);
  v_uvq = a_uvq;
}
`;

const FRAG_SRC = `#version 300 es
precision highp float;
in vec3 v_uvq;
uniform sampler2D u_tex;
uniform sampler2D u_maskTex;
uniform float u_alpha;
uniform int u_ink;
uniform int u_hasAlpha;
uniform vec3 u_keyColor;
uniform int u_softKey;
out vec4 outColor;
void main() {
  vec2 uv = v_uvq.xy / v_uvq.z;
  vec4 texel;
  if (u_softKey == 1) {
    // HD art is mipmapped. The terrain tiles are strongly squashed quads, and the mip
    // level follows the most squashed direction, so a whole tile came out blurrier than
    // the unmipmapped original. Cap the footprint at 2:1 to keep the detail along the
    // other direction (anisotropic filtering, where available, does the rest).
    vec2 sz = vec2(textureSize(u_tex, 0));
    vec2 gx = dFdx(uv), gy = dFdy(uv);
    float lx = length(gx * sz), ly = length(gy * sz);
    float lmin = max(min(lx, ly), 1e-6);
    if (lx > 2.0 * lmin) gx *= 2.0 * lmin / lx;
    if (ly > 2.0 * lmin) gy *= 2.0 * lmin / ly;
    texel = textureGrad(u_tex, uv, gx, gy);
  } else {
    texel = texture(u_tex, uv);
  }
  float a = texel.a;

  if (u_ink == 9) {
    vec4 m = texture(u_maskTex, uv);
    float maskLuma = dot(m.rgb, vec3(0.299, 0.587, 0.114));
    a = (1.0 - maskLuma) * m.a;
  } else if (u_ink == 36 || (u_ink == 8 && u_hasAlpha == 0)) {
    vec3 diff = abs(texel.rgb - u_keyColor);
    if (u_softKey == 1) {
      // Upscaled art blends the key colour into the sprite's edge pixels. Key those
      // softly and take the key colour back out of their RGB, so no white or magenta
      // rim is left around the sprite.
      float k = smoothstep(0.04, 0.22, max(diff.r, max(diff.g, diff.b)));
      if (k > 0.0 && k < 1.0) {
        texel.rgb = clamp((texel.rgb - u_keyColor * (1.0 - k)) / k, 0.0, 1.0);
      }
      a *= k;
    } else if (all(lessThan(diff, vec3(0.04)))) {
      a = 0.0;
    }
  }

  a *= u_alpha;
  if (a <= 0.002) discard;
  if (u_ink == 37) {
    // Lightest: blended with a MAX equation, so fold the alpha into the colour.
    outColor = vec4(texel.rgb * a, a);
    return;
  }
  outColor = vec4(texel.rgb, a);
}
`;

const WHITE = [255, 255, 255] as const;

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('Failed to create WebGL shader');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh) ?? 'Unknown shader error';
    gl.deleteShader(sh);
    throw new Error(info);
  }
  return sh;
}

export class WebGL2StageRenderer {
  public readonly gl: WebGL2RenderingContext;
  public readonly stageWidth: number;
  public readonly stageHeight: number;
  private renderScale: number;

  private readonly canvas: HTMLCanvasElement;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly vbo: WebGLBuffer;
  private readonly vertexData = new Float32Array(6 * 5);
  private readonly whiteFallbackTex: WebGLTexture;
  private readonly ownedTextures = new Set<WebGLTexture>();
  private readonly anisotropy: { ext: EXT_texture_filter_anisotropic; max: number } | null;

  private readonly uStageSize: WebGLUniformLocation;
  private readonly uTex: WebGLUniformLocation;
  private readonly uMaskTex: WebGLUniformLocation;
  private readonly uAlpha: WebGLUniformLocation;
  private readonly uInk: WebGLUniformLocation;
  private readonly uHasAlpha: WebGLUniformLocation;
  private readonly uKeyColor: WebGLUniformLocation;
  private readonly uSoftKey: WebGLUniformLocation;

  constructor(canvas: HTMLCanvasElement, stageWidth = 512, stageHeight = 330, renderScale = 1) {
    this.canvas = canvas;
    this.stageWidth = stageWidth;
    this.stageHeight = stageHeight;
    this.renderScale = Math.max(1, Math.min(8, renderScale));
    canvas.width = Math.round(stageWidth * this.renderScale);
    canvas.height = Math.round(stageHeight * this.renderScale);

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: true,
      premultipliedAlpha: false,
    });
    if (!gl) {
      throw new Error('WebGL2 is not supported in this browser');
    }
    this.gl = gl;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    const prog = gl.createProgram();
    if (!prog) throw new Error('Failed to create WebGL program');
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) ?? 'Program link failed');
    }
    this.program = prog;

    this.uStageSize = gl.getUniformLocation(prog, 'u_stageSize')!;
    this.uTex = gl.getUniformLocation(prog, 'u_tex')!;
    this.uMaskTex = gl.getUniformLocation(prog, 'u_maskTex')!;
    this.uAlpha = gl.getUniformLocation(prog, 'u_alpha')!;
    this.uInk = gl.getUniformLocation(prog, 'u_ink')!;
    this.uHasAlpha = gl.getUniformLocation(prog, 'u_hasAlpha')!;
    this.uKeyColor = gl.getUniformLocation(prog, 'u_keyColor')!;
    this.uSoftKey = gl.getUniformLocation(prog, 'u_softKey')!;

    this.vao = gl.createVertexArray()!;
    this.vbo = gl.createBuffer()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);

    const aPos = gl.getAttribLocation(prog, 'a_pos');
    const aUvq = gl.getAttribLocation(prog, 'a_uvq');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(aUvq);
    gl.vertexAttribPointer(aUvq, 3, gl.FLOAT, false, 20, 8);
    gl.bindVertexArray(null);

    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    this.anisotropy = aniso
      ? { ext: aniso, max: Math.min(16, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number) }
      : null;

    this.whiteFallbackTex = this.createSolidTexture(255, 255, 255, 255);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }


  private createSolidTexture(r: number, g: number, b: number, a: number): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([r, g, b, a]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.ownedTextures.add(tex);
    return tex;
  }

  public createImageTexture(
    source: HTMLImageElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas,
    regX: number,
    regY: number,
    hasAlpha: boolean,
    hd?: { logicalWidth: number; logicalHeight: number }
  ): TextureEntry {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (hd) {
      // Upscaled art is often drawn smaller than its pixel size (far sprites, 2x
      // backgrounds on small screens): mipmaps keep it from shimmering.
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      // The terrain tiles are drawn as strongly slanted quads. Plain trilinear filtering
      // picks the mip level from the most squashed direction and blurs the whole tile,
      // so near tiles looked low-res next to their neighbours: filter anisotropically.
      if (this.anisotropy) {
        gl.texParameterf(gl.TEXTURE_2D, this.anisotropy.ext.TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropy.max);
      }
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.ownedTextures.add(tex);

    if (hd) {
      // Report the member's own size, so sprite rects, collisions and reg points are
      // exactly those of the original bitmap; only the sampled image is sharper.
      return { texture: tex, width: hd.logicalWidth, height: hd.logicalHeight, regX, regY, hasAlpha, hd: true };
    }
    const w = 'naturalWidth' in source ? source.naturalWidth : source.width;
    const h = 'naturalHeight' in source ? source.naturalHeight : source.height;
    return { texture: tex, width: w, height: h, regX, regY, hasAlpha };
  }

  public setRenderScale(scale: number): void {
    const next = Math.max(1, Math.min(8, scale));
    if (next === this.renderScale) return;
    this.renderScale = next;
    this.canvas.width = Math.round(this.stageWidth * this.renderScale);
    this.canvas.height = Math.round(this.stageHeight * this.renderScale);
  }

  public getRenderScale(): number {
    return this.renderScale;
  }

  public deleteTexture(entry: TextureEntry): void {
    if (this.ownedTextures.has(entry.texture)) {
      this.ownedTextures.delete(entry.texture);
      this.gl.deleteTexture(entry.texture);
    }
  }

  public updateTextureFromCanvas(entry: TextureEntry, canvas: HTMLCanvasElement): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, entry.texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  }

  public renderFrame(
    bgColor: readonly [number, number, number],
    sprites: readonly RenderSprite[]
  ): void {
    const gl = this.gl;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(bgColor[0] / 255, bgColor[1] / 255, bgColor[2] / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.uniform2f(this.uStageSize, this.stageWidth, this.stageHeight);
    gl.uniform1i(this.uTex, 0);
    gl.uniform1i(this.uMaskTex, 1);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

    const ordered = sortSpritesForRender(sprites);
    let currentBlendMode = -1;

    for (const sp of ordered) {
      if (sp.visible === false || !sp.texture || sp.blend <= 0) continue;

      const corners = computeSpriteCorners({
        locH: sp.locH,
        locV: sp.locV,
        width: sp.width,
        height: sp.height,
        texWidth: sp.texture.width,
        texHeight: sp.texture.height,
        regX: sp.texture.regX,
        regY: sp.texture.regY,
        rotation: sp.rotation,
        flipH: sp.flipH,
        flipV: sp.flipV,
        quad: sp.quad,
      });

      const [p0, p1, p2, p3] = corners;
      const [q0, q1, q2, q3] = sp.quad
        ? computeQuadProjectiveFactors(p0, p1, p2, p3)
        : ([1, 1, 1, 1] as const);

      const u0 = sp.flipH ? 1 : 0;
      const u1 = sp.flipH ? 0 : 1;
      const v0 = sp.flipV ? 1 : 0;
      const v1 = sp.flipV ? 0 : 1;

      // Two triangles: (p0, p1, p2) and (p0, p2, p3) with projective (u*q, v*q, q)
      const vd = this.vertexData;
      // v0: TL
      vd[0] = p0.x; vd[1] = p0.y; vd[2] = u0 * q0; vd[3] = v0 * q0; vd[4] = q0;
      // v1: TR
      vd[5] = p1.x; vd[6] = p1.y; vd[7] = u1 * q1; vd[8] = v0 * q1; vd[9] = q1;
      // v2: BR
      vd[10] = p2.x; vd[11] = p2.y; vd[12] = u1 * q2; vd[13] = v1 * q2; vd[14] = q2;
      // v3: TL
      vd[15] = p0.x; vd[16] = p0.y; vd[17] = u0 * q0; vd[18] = v0 * q0; vd[19] = q0;
      // v4: BR
      vd[20] = p2.x; vd[21] = p2.y; vd[22] = u1 * q2; vd[23] = v1 * q2; vd[24] = q2;
      // v5: BL
      vd[25] = p3.x; vd[26] = p3.y; vd[27] = u0 * q3; vd[28] = v1 * q3; vd[29] = q3;

      const blendMode =
        sp.ink === DIRECTOR_INK.LIGHTEST
          ? 2
          : sp.ink === DIRECTOR_INK.ADD || sp.ink === DIRECTOR_INK.ADD_PIN
            ? 1
            : 0;
      if (blendMode !== currentBlendMode) {
        currentBlendMode = blendMode;
        gl.blendEquation(blendMode === 2 ? gl.MAX : gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, blendMode === 1 ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sp.texture.texture);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, sp.maskTexture?.texture ?? this.whiteFallbackTex);

      gl.uniform1f(this.uAlpha, Math.max(0, Math.min(100, sp.blend)) / 100);
      gl.uniform1i(this.uInk, sp.ink);
      gl.uniform1i(this.uHasAlpha, sp.texture.hasAlpha ? 1 : 0);
      const key = sp.keyColor ?? WHITE;
      gl.uniform3f(this.uKeyColor, key[0] / 255, key[1] / 255, key[2] / 255);
      gl.uniform1i(this.uSoftKey, sp.texture.hd ? 1 : 0);

      gl.bufferSubData(gl.ARRAY_BUFFER, 0, vd);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    gl.blendEquation(gl.FUNC_ADD);
    gl.bindVertexArray(null);
  }

  public dispose(): void {
    const gl = this.gl;
    for (const tex of this.ownedTextures) {
      gl.deleteTexture(tex);
    }
    this.ownedTextures.clear();
    gl.deleteBuffer(this.vbo);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
  }
}

