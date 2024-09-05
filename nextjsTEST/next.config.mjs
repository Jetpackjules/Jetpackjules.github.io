/** @type {import('next').NextConfig} */
const nextConfig = {
    basePath: "/nextjsTEST",

    output: "export",  // <=== enables static exports
    reactStrictMode: true,

};

// module.exports = nextConfig;
export default nextConfig;
