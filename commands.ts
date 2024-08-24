export interface INamedType {
  name: string;
  documentation: string;
  type: TypeDefinition;
}

enum NodeType {
  Enum = "enum",
  Type = "type",
  Integer = "integer",
  TypeReference = "typeReference",
  TypeDefinitionProperty = "typeDefinitionProperty",
}

export interface ITypeDefinitionTypeReference {
  type: NodeType.TypeReference;
  name: string;
}

export interface ITypeDefinitionInteger {
  type: NodeType.Integer;
  documentation?: string;
}

export interface INode {
  documentation?: string | string[];
}

export interface IEnumItem extends INode {
  name: string;
}

export interface ITypeDefinitionEnum {
  type: NodeType.Enum;
  body: IEnumItem[];
}

export interface ITypeDefinitionProperty extends INode {
  type: NodeType.TypeDefinitionProperty;
  name: string;
  body: TypeDefinition | TypeDefinition[];
}

export interface ITypeDefinitionType {
  type: NodeType.Type;
  body: ITypeDefinitionProperty[];
}

type TypeDefinition =
  | ITypeDefinitionEnum
  | ITypeDefinitionTypeReference
  | ITypeDefinitionInteger
  | ITypeDefinitionType;

interface IFFmpegArgumentOption {
  name: string;
  type: TypeDefinition | TypeDefinition[];
}

interface IFFmpegArgument {
  name: string;
  body: IFFmpegArgumentOption[];
}

export interface ICommands {
  types: INamedType[];
  arguments: IFFmpegArgument[];
}

const commands: ICommands = {
  types: [
    {
      name: "FFmpegScalerOptions",
      documentation:
        "The video scaler supports the following named options.\n\nOptions may be set by specifying -option value in the FFmpeg tools, with a few API-only exceptions noted below. For programmatic use, they can be set explicitly in the SwsContext options or through the libavutil/opt.h API.",
      type: {
        type: NodeType.Enum,
        body: [
          {
            name: "fast_bilinear",
          },
          {
            name: "bilinear",
          },
          {
            name: "bicubic",
          },
          {
            name: "experimental",
          },
          {
            name: "neighbor",
          },
          {
            name: "area",
          },
          {
            name: "bicublin",
          },
          {
            name: "gauss",
          },
          {
            name: "sinc",
          },
          {
            name: "lanczos",
          },
          {
            name: "spline",
          },
          {
            name: "print_info",
          },
          {
            name: "accurate_rnd",
          },
          {
            name: "full_chroma_int",
          },
          {
            name: "full_chroma_inp",
          },
          {
            name: "bitexact",
          },
        ],
      },
    },
  ],
  arguments: [
    {
      name: "-filter_complex",
      body: [
        {
          name: "paletteuse",
          type: {
            type: NodeType.Type,
            body: [
              {
                name: "dither",
                type: NodeType.TypeDefinitionProperty,
                body: {
                  type: NodeType.Enum,
                  body: [
                    {
                      name: "bayer",
                      documentation:
                        "Ordered 8x8 bayer dithering (deterministic)",
                    },
                    {
                      name: "heckbert",
                      documentation:
                        'Dithering as defined by Paul Heckbert in 1982 (simple error diffusion). Note: this dithering is sometimes considered "wrong" and is included as a reference.',
                    },
                    {
                      name: "floyd_steinberg",
                      documentation:
                        "Floyd and Steingberg dithering (error diffusion)",
                    },
                    {
                      name: "sierra2",
                      documentation:
                        "Frankie Sierra dithering v2 (error diffusion)",
                    },
                    {
                      name: "sierra2_4a",
                      documentation:
                        'Frankie Sierra dithering v2 "Lite" (error diffusion)',
                    },
                    {
                      name: "sierra3",
                      documentation:
                        "Frankie Sierra dithering v3 (error diffusion)",
                    },
                    {
                      name: "burkes",
                      documentation: "Burkes dithering (error diffusion)",
                    },
                    {
                      name: "atkinson",
                      documentation:
                        "Atkinson dithering by Bill Atkinson at Apple Computer (error diffusion)",
                    },
                    {
                      name: "none",
                      documentation: "Disable dithering.",
                    },
                  ],
                },
              },
              {
                type: NodeType.TypeDefinitionProperty,
                name: "bayer_scale",
                body: {
                  type: NodeType.Integer,
                },
                documentation: [
                  "When bayer dithering is selected, this option defines the scale of the pattern (how much the crosshatch pattern is visible). ",
                  "A low value means more visible pattern for less banding, and higher value means less visible pattern at the cost of more banding.",
                  "The option must be an integer value in the range [0,5]. Default is 2.",
                ],
              },
              {
                name: "diff_mode",
                type: NodeType.TypeDefinitionProperty,
                body: {
                  type: NodeType.Enum,
                  body: [
                    {
                      name: "rectangle",
                      documentation: [
                        "Only the changing rectangle will be reprocessed. This is similar to GIF cropping/offsetting compression mechanism. This option can be useful for speed if only a part of the image is changing, and has use cases such as limiting the scope of the error diffusal dither to the rectangle that bounds the moving scene (it leads to more deterministic output if the scene doesn't change much, and as a result less moving noise and better GIF compression).",
                      ],
                    },
                  ],
                },
              },
              {
                name: "new",
                type: NodeType.TypeDefinitionProperty,
                body: [],
                documentation: "Take new palette for each output frame.",
              },
              {
                name: "alpha_threshold",
                type: NodeType.TypeDefinitionProperty,
                body: {
                  type: NodeType.Integer,
                },
                documentation: [
                  "Sets the alpha threshold for transparency. Alpha values above this threshold will be treated as completely opaque, nd values below this threshold will be treated as completely transparent.",
                  "The option must be an integer value in the range [0,255]. Default is 128.",
                ],
              },
            ],
          },
        },
        {
          name: "scale",
          type: {
            type: NodeType.Type,
            body: [
              {
                name: "width",
                type: NodeType.TypeDefinitionProperty,
                body: {
                  type: NodeType.Integer,
                  documentation: "The width of the output video.",
                },
              },
              {
                name: "width",
                type: NodeType.TypeDefinitionProperty,
                body: {
                  type: NodeType.Integer,
                  documentation: "The height of the output video.",
                },
              },
              {
                name: "eval",
                type: NodeType.TypeDefinitionProperty,
                body: {
                  type: NodeType.Enum,
                  body: [
                    {
                      name: "init",
                      documentation:
                        "Only evaluate expressions once during the filter initialization or when a command is processed.",
                    },
                    {
                      name: "frame",
                      documentation:
                        "Evaluate expressions for each incoming frame.",
                    },
                  ],
                },
              },
              {
                name: "flags",
                type: NodeType.TypeDefinitionProperty,
                body: {
                  type: NodeType.TypeReference,
                  name: "FFmpegScalerOptions",
                },
                documentation: "Set the flags for the scale filter.",
              },
            ],
          },
        },
        {
          name: "fps",
          type: [
            {
              type: NodeType.Integer,
            },
            {
              type: NodeType.Type,
              body: [
                {
                  name: "fps",
                  type: NodeType.TypeDefinitionProperty,
                  documentation: "The desired output frame rate.",
                  body: [
                    {
                      type: NodeType.Enum,
                      body: [
                        {
                          name: "source_fps",
                          documentation: "The input's frame rate",
                        },
                        {
                          name: "ntsc",
                          documentation: "NTSC frame rate of 30000/1001",
                        },
                        {
                          name: "pal",
                          documentation: "PAL frame rate of 25.0",
                        },
                        {
                          name: "film",
                          documentation: "Film frame rate of 24.0",
                        },
                      ],
                    },
                    {
                      type: NodeType.Integer,
                    },
                  ],
                },
              ],
            },
            {
              type: NodeType.Type,
              body: [
                {
                  type: NodeType.TypeDefinitionProperty,
                  name: "round",
                  body: {
                    type: NodeType.Enum,
                    body: [
                      {
                        name: "zero",
                        documentation: "round towards 0",
                      },
                      {
                        name: "inf",
                        documentation: "round away from 0",
                      },
                      {
                        name: "down",
                        documentation: "round towards -infinity",
                      },
                      {
                        name: "up",
                        documentation: "round towards +infinity",
                      },
                      {
                        name: "near",
                        documentation: "round to nearest",
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
export default commands;
