import {caller} from "@/trpc/server";

const Page = async () =>{
  const greeting = await caller.hello({text: "Aditya"});

  return (
    <div>
      {JSON.stringify(greeting)}
    </div>
  );
}

export default Page;