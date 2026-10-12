require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "legacy-container"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://example.invalid/legacy-container"
  s.license      = "MIT"
  s.authors      = "repro"
  s.platforms    = { :ios => "15.1" }
  s.source       = { :git => "https://example.invalid/legacy-container.git", :tag => s.version.to_s }
  s.source_files = "ios/**/*.{h,m}"
  s.dependency "React-Core"
end
