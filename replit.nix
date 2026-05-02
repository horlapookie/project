{pkgs}: {
  deps = [
    pkgs.python3
    pkgs.pkg-config
    pkgs.librsvg
    pkgs.giflib
    pkgs.libpng
    pkgs.libjpeg
    pkgs.pango
    pkgs.cairo
    pkgs.ffmpeg
    pkgs.pixman
    pkgs.util-linux
  ];
}
