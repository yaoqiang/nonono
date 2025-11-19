import { motion } from "motion/react";


const showcaseItems = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1628522994788-53bc1b1502c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjBhcnQlMjBncmFmZml0aXxlbnwxfHx8fDE3NjM0MTc5NzB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "街头艺术革命",
    description: "用色彩打破城市的灰色",
    author: "匿名创作者",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1650114367479-3f9f75aff6fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmVhdGl2ZSUyMG5lb24lMjBhcnR8ZW58MXx8fHwxNzYzNDM4NjA3fDA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "霓虹梦境",
    description: "光影中的另类表达",
    author: "夜行者",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1636220409261-794e0464ca2b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGNvbG9yZnVsJTIwcGFpbnR8ZW58MXx8fHwxNzYzNDIxNjY0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "抽象叛逆",
    description: "无需理解，只需感受",
    author: "色彩狂人",
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1760574740262-c0e0d456f9b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWJlbGxpb3VzJTIweW91dGglMjBjdWx0dXJlfGVufDF8fHx8MTc2MzQzODYwN3ww&ixlib=rb-4.1.0&q=80&w=1080",
    title: "青春不妥协",
    description: "我的态度，我的选择",
    author: "自由灵魂",
  },
];

export function ShowcaseSection() {
  return (
    <section className="relative bg-black py-24 px-6 overflow-hidden">
      {/* Background text */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <p className="text-white text-9xl font-black transform -rotate-12">
          SHOWCASE
        </p>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-7xl font-black text-white mb-4">
              精选<span className="text-[#00FF41]">案例</span>
            </h2>
            <div className="inline-block bg-[#FF10F0] text-black px-6 py-2 rotate-[-2deg] mt-4">
              <p className="text-xl font-black">极富个人色彩的作品故事</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {showcaseItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative overflow-hidden border-4 border-white"
                style={{ rotate: index % 2 === 0 ? "2deg" : "-2deg" }}
                whileHover={{
                  rotate: 0,
                  scale: 1.05,
                  borderColor: index % 2 === 0 ? "#00FF41" : "#FF10F0",
                }}
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />

                  {/* Overlay on hover */}
                  <motion.div
                    className="absolute inset-0 bg-black bg-opacity-90 flex flex-col justify-center items-center p-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <h3 className="text-3xl font-black text-white mb-3 text-center">
                      {item.title}
                    </h3>
                    <p className="text-xl text-[#00FF41] mb-4 text-center">
                      {item.description}
                    </p>
                    <div className="inline-block bg-[#FF10F0] text-white px-4 py-2 rotate-[2deg]">
                      <p className="font-black">by {item.author}</p>
                    </div>
                  </motion.div>
                </div>

                {/* Corner decoration */}
                <div
                  className="absolute -top-3 -right-3 w-12 h-12 border-4 border-white rotate-45"
                  style={{
                    backgroundColor: index % 2 === 0 ? "#00FF41" : "#FF10F0",
                  }}
                />
              </motion.div>
            ))}
          </div>

          {/* View more button */}
          <motion.div
            className="mt-16 text-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <button className="bg-white text-black px-12 py-6 text-2xl font-black border-4 border-white hover:bg-[#00FF41] hover:border-[#00FF41] transition-colors relative overflow-hidden group">
              <span className="relative z-10">查看更多作品</span>
              <motion.div
                className="absolute inset-0 bg-[#FF10F0]"
                initial={{ x: "-100%" }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
              <span className="relative z-10">查看更多作品</span>
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
