#version 310 es

#extension GL_GOOGLE_include_directive : enable

#include "constants.h"

layout(input_attachment_index = 0, set = 0, binding = 0) uniform highp subpassInput in_color;

layout(set = 0, binding = 1) uniform sampler2D color_grading_lut_texture_sampler;

layout(location = 0) out highp vec4 out_color;

highp vec4 sample_at(in highp float size, in highp vec3 coord)
{
    highp vec2 uv = vec2(
        (coord.z * size + coord.x) / (size * size),
        coord.y / size
    );
    return texture(color_grading_lut_texture_sampler, uv);
}


highp vec3 trilinear_interp(in highp float color_size, in highp vec2 lower_coord, in highp vec2 upper_coord, in highp float z, in highp vec2 alpha)
{
    highp vec3 color1 = sample_at(color_size, vec3(lower_coord, z)).rgb;
    highp vec3 color2 = sample_at(color_size, vec3(upper_coord.x, lower_coord.y, z)).rgb;
    highp vec3 color3 = sample_at(color_size, vec3(lower_coord.x, upper_coord.y, z)).rgb;
    highp vec3 color4 = sample_at(color_size, vec3(upper_coord.xy, z)).rgb;
    return mix(mix(color1, color2, alpha.x), mix(color3, color4, alpha.x), alpha.y);
}

void main()
{
    highp ivec2 lut_tex_size = textureSize(color_grading_lut_texture_sampler, 0);

    highp float _COLORS = float(lut_tex_size.y);

    highp vec3 color       = subpassLoad(in_color).rgb;
    
    highp vec3 coord = color * _COLORS;

    highp vec3 coord_centric = floor(coord) + 0.5f;
    highp vec3 upper_coord = floor(coord) + step(0.5f, fract(coord));
    highp vec3 lower_coord = upper_coord - 1.f;
    lower_coord = clamp(lower_coord, 0.f, _COLORS - 1.f);

    highp vec3 alpha = mod(fract(coord) - 0.5f, 1.f);

    highp vec3 lower_z_color = trilinear_interp(_COLORS, lower_coord.xy, upper_coord.xy, lower_coord.z, alpha.xy);
    highp vec3 upper_z_color = trilinear_interp(_COLORS, lower_coord.xy, upper_coord.xy, upper_coord.z, alpha.xy);

    highp vec3 result = mix(lower_z_color, upper_z_color, alpha.z);
    out_color = vec4(result, 1.f);
}
