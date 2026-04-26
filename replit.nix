{ pkgs }: {
    deps = [
      pkgs.python3
      pkgs.librsvg
      pkgs.giflib
      pkgs.libpng
      pkgs.libjpeg
      pkgs.pango
      pkgs.cairo
      pkgs.pkg-config

        pkgs.nodejs-16_x
        pkgs.libwebp
        pkgs.python
	    pkgs.nodePackages.typescript
        pkgs.libuuid
        pkgs.ffmpeg
        pkgs.imagemagick  
        pkgs.wget
        pkgs.git
        pkgs.nodePackages.pm2
    ];
  env ={
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [pkgs.libuuid];
  };
}