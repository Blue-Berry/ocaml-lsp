open Import
module Bin = Stdune.Bin

let _PATH =
  lazy (Bin.parse_path (Option.value ~default:"" (Unix_env.get Unix_env.initial "PATH")))
;;

let which x = Bin.which ~path:(Lazy.force _PATH) x |> Option.map ~f:Stdune.Path.to_string
