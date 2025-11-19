import { motion } from "motion/react";
import { Instagram, Twitter, Github, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative bg-black text-white py-16 px-6 overflow-hidden border-t-8 border-[#00FF41]">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <h3 className="text-4xl font-black mb-4">
              nonono<span className="text-[#FF10F0]">.online</span>
            </h3>
            <p className="text-lg text-gray-400">
              表达真我，拒绝套路
            </p>
            <div className="mt-4 h-1 w-20 bg-[#00FF41]" />
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xl font-black mb-4 text-[#00FF41]">快速链接</h4>
            <ul className="space-y-2">
              {["关于我们", "社区规则", "创作指南", "联系我们"].map((link, index) => (
                <motion.li
                  key={index}
                  whileHover={{ x: 5, color: "#FF10F0" }}
                >
                  <a href="#" className="text-gray-400 hover:text-[#FF10F0] transition-colors">
                    {link}
                  </a>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-xl font-black mb-4 text-[#FF10F0]">关注我们</h4>
            <div className="flex gap-4">
              {[
                { icon: Instagram, color: "#FF10F0" },
                { icon: Twitter, color: "#00FF41" },
                { icon: Github, color: "#FFFFFF" },
              ].map((social, index) => (
                <motion.a
                  key={index}
                  href="#"
                  className="w-12 h-12 border-2 border-white flex items-center justify-center hover:bg-white hover:text-black transition-colors"
                  whileHover={{ scale: 1.1, rotate: 15 }}
                  whileTap={{ scale: 0.9 }}
                  style={{ borderColor: social.color }}
                >
                  <social.icon className="w-6 h-6" />
                </motion.a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-gray-400 flex items-center justify-center gap-2">
            Made with <Heart className="w-4 h-4 text-[#FF10F0] fill-[#FF10F0]" /> by nonono.online
          </p>
          <p className="text-sm text-gray-600 mt-2">
            © 2025 nonono.online. 保持特别，拒绝平庸。
          </p>
        </div>
      </div>

      {/* Decorative element */}
      <motion.div
        className="absolute -bottom-10 -right-10 w-40 h-40 border-8 border-[#00FF41] rotate-45 opacity-20"
        animate={{ rotate: [45, 135, 45] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
    </footer>
  );
}
