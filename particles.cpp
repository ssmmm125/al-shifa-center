// Al-Shifa Center website - hero ambient animation engine (C++ -> WebAssembly)
// Simulates golden steam/dust particles drifting upward, reacting to the visitor's pointer.
// JS renders; all motion physics is computed here in C++.
#include <cstdlib>
#include <cmath>

static int N = 0;
static float W = 800, H = 600;
static float* px = nullptr;   // x per particle
static float* py = nullptr;   // y per particle
static float* pvx = nullptr;
static float* pvy = nullptr;
static float* psize = nullptr;
static float* pphase = nullptr;
static float* out = nullptr;  // interleaved output: x, y, size, alpha
static float pointerX = -10000, pointerY = -10000;
static int pointerActive = 0;
static unsigned rngState = 12345;

static float frand() { // deterministic LCG, no reseed surprises
    rngState = rngState * 1664525u + 1013904223u;
    return (rngState >> 8) / 16777216.0f;
}

static void respawn(int i, bool anywhere) {
    px[i] = frand() * W;
    py[i] = anywhere ? frand() * H : H + 10.0f + frand() * 40.0f;
    pvx[i] = (frand() - 0.5f) * 12.0f;
    pvy[i] = -(14.0f + frand() * 26.0f);   // upward drift
    psize[i] = 1.2f + frand() * 3.2f;
    pphase[i] = frand() * 6.28318f;
}

extern "C" {

void init(int n, float w, float h) {
    if (px) { free(px); free(py); free(pvx); free(pvy); free(psize); free(pphase); free(out); }
    N = n; W = w; H = h;
    px = (float*)malloc(N * sizeof(float));
    py = (float*)malloc(N * sizeof(float));
    pvx = (float*)malloc(N * sizeof(float));
    pvy = (float*)malloc(N * sizeof(float));
    psize = (float*)malloc(N * sizeof(float));
    pphase = (float*)malloc(N * sizeof(float));
    out = (float*)malloc(N * 4 * sizeof(float));
    for (int i = 0; i < N; i++) respawn(i, true);
}

void resize(float w, float h) { W = w; H = h; }

void setPointer(float x, float y, int active) { pointerX = x; pointerY = y; pointerActive = active; }

// advance simulation dt seconds; returns pointer to N*4 floats (x, y, radius, alpha)
float* step(float dt, float t) {
    if (dt > 0.05f) dt = 0.05f;
    for (int i = 0; i < N; i++) {
        // gentle sinusoidal sway
        float sway = sinf(t * 0.8f + pphase[i]) * 9.0f;
        pvx[i] += sway * dt * 0.4f;
        // pointer interaction: soft repulsion, like steam pushed aside
        if (pointerActive) {
            float dx = px[i] - pointerX, dy = py[i] - pointerY;
            float d2 = dx * dx + dy * dy;
            float R = 110.0f;
            if (d2 < R * R && d2 > 0.01f) {
                float d = sqrtf(d2);
                float f = (1.0f - d / R) * 260.0f;
                pvx[i] += (dx / d) * f * dt;
                pvy[i] += (dy / d) * f * dt;
            }
        }
        // damping keeps motion calm
        pvx[i] *= (1.0f - 1.6f * dt);
        pvy[i] += (-(14.0f + 20.0f * psize[i] / 4.4f) - pvy[i]) * 0.5f * dt;
        px[i] += pvx[i] * dt;
        py[i] += pvy[i] * dt;
        if (py[i] < -20.0f || px[i] < -30.0f || px[i] > W + 30.0f) respawn(i, false);
        float alpha = 0.25f + 0.55f * (0.5f + 0.5f * sinf(t * 1.7f + pphase[i] * 2.0f));
        // fade near edges
        float edge = py[i] / H;
        if (edge < 0.12f) alpha *= edge / 0.12f;
        out[i * 4 + 0] = px[i];
        out[i * 4 + 1] = py[i];
        out[i * 4 + 2] = psize[i];
        out[i * 4 + 3] = alpha;
    }
    return out;
}

int count() { return N; }

}
